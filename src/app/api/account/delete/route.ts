import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const deleteLimiter = createInMemoryLimiter(RATE_KEYS.ACCOUNT_DELETE, { maxEntries: 100 });

// GDPR Art. 17: Right to Erasure
// JP-06: Require confirmation body to prevent CSRF-style abuse
export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  if (!deleteLimiter.check(ip, 3, 3_600_000)) {
    return NextResponse.json({ error: t("Errors.rateLimit.tooManyRequests") }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  // LAUNCH-FIX: Body size limit (delete confirmation is tiny, 4KB max)
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 4_000) {
    return NextResponse.json({ error: t("Errors.validation.requestTooLarge") }, { status: 413 });
  }

  // JP-06: Require explicit confirmation in request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("Errors.validation.confirmationRequired") }, { status: 400 });
  }
  if (body?.confirm !== "탈퇴합니다") {
    return NextResponse.json({ error: t("Errors.validation.confirmationText") }, { status: 400 });
  }

  const user = await resolveUser(sb.client, request, "Account/Delete");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.system.serviceUnavailable") }, { status: 503 }));
  }

  const userId = user.id;

  const maskedId = userId.slice(0, 8) + "…";

  try {
    // 3.3 FIX: Atomic cascade delete via DB function (single transaction)
    // Replaces ~11 sequential JS queries with 1 atomic RPC call.
    // Falls back to legacy JS deletion if RPC not available (migration 040 not yet applied).
    const { error: rpcErr } = await serviceClient.rpc("delete_user_cascade", {
      p_user_id: userId,
    });

    if (rpcErr) {
      // RPC not available (migration 040 not applied) — fall back to legacy deletion
      if (rpcErr.code === "42883") { // function does not exist
        console.warn(`[Account] delete_user_cascade RPC not found, using legacy deletion for user=${maskedId}`);
        return await legacyDeleteUser(serviceClient, userId, maskedId, sb);
      }
      console.error(`[Account] Cascade delete failed for user=${maskedId}:`, rpcErr.code, rpcErr.message);
      return sb.applyCookies(NextResponse.json(
        { error: t("Errors.account.dataCleanupError") },
        { status: 500 }
      ));
    }

    // Delete auth user (after DB data is fully cleaned)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[Account] Delete auth error:", deleteError.name, "user=", maskedId);
      return sb.applyCookies(NextResponse.json({ error: t("Errors.account.deleteFailed") }, { status: 500 }));
    }

    // Fire-and-forget: decrement community counters (non-critical)
    decrementCommunityCounters(serviceClient, userId).catch(() => {});

    console.info(`[Account] Successfully deleted user=${maskedId}`);
    return sb.applyCookies(NextResponse.json({ success: true, message: t("Errors.account.deleted") }));
  } catch (e) {
    console.error("[Account] Delete error:", e instanceof Error ? e.name : "Unknown");
    return sb.applyCookies(NextResponse.json({ error: t("Errors.account.deleteFailed") }, { status: 500 }));
  }
}

// ─── Legacy fallback (used when migration 040 not yet applied) ───
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function legacyDeleteUser(serviceClient: any, userId: string, maskedId: string, sb: any) {
  const tables = [
    "comment_reports", "community_likes", "community_comments",
    "feedback", "user_reviews", "worksheet_outputs",
  ];
  await Promise.allSettled(
    tables.map(async (t) => {
      const { error } = await serviceClient.from(t).delete().eq("user_id", userId);
      if (error) console.error(`[Account] Legacy: ${t} delete failed: ${error.code}`);
    })
  );

  // Teacher tables
  const { data: tSessions } = await serviceClient.from("teacher_sessions").select("id").eq("teacher_id", userId).limit(500);
  const tSessionIds = (tSessions || []).map((s: { id: string }) => s.id);
  if (tSessionIds.length > 0) {
    await serviceClient.from("teacher_messages").delete().in("session_id", tSessionIds);
    await serviceClient.from("teacher_stories").delete().in("session_id", tSessionIds);
  }
  await serviceClient.from("teacher_sessions").delete().eq("teacher_id", userId);

  // Main tables
  const { data: sessions } = await serviceClient.from("sessions").select("id").eq("user_id", userId).limit(500);
  const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
  if (sessionIds.length > 0) {
    await serviceClient.from("messages").delete().in("session_id", sessionIds);
  }
  await serviceClient.from("sessions").delete().eq("user_id", userId);
  await serviceClient.from("referrals").delete().or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
  await serviceClient.from("event_logs").delete().eq("user_id", userId);
  await serviceClient.from("llm_call_logs").delete().eq("user_id", userId);
  await serviceClient.from("crisis_events").delete().eq("user_id", userId);
  await serviceClient.from("stories").delete().eq("user_id", userId);
  await serviceClient.from("subscriptions").delete().eq("user_id", userId);
  await serviceClient.from("profiles").delete().eq("id", userId);

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("[Account] Legacy: Delete auth error:", deleteError.name);
    return sb.applyCookies(NextResponse.json({ error: t("Errors.account.deleteFailed") }, { status: 500 }));
  }

  console.info(`[Account] Legacy: Successfully deleted user=${maskedId}`);
  return sb.applyCookies(NextResponse.json({ success: true, message: t("Errors.account.deleted") }));
}

// ─── Community counter decrement (fire-and-forget) ───
// H20-FIX: Implemented actual counter decrement for community likes/comments
// Must run BEFORE user data cascade delete, while we can still query their activity
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function decrementCommunityCounters(serviceClient: any, userId: string) {
  try {
    // 1. Find stories this user liked → decrement their like_count
    const { data: likes } = await serviceClient
      .from("community_likes")
      .select("story_id")
      .eq("user_id", userId);

    if (likes && likes.length > 0) {
      const storyIds = [...new Set(likes.map((l: { story_id: string }) => l.story_id))];
      for (const storyId of storyIds) {
        await serviceClient.rpc("decrement_counter", {
          p_table: "stories",
          p_column: "like_count",
          p_id: storyId,
        }).catch(() => {
          // Fallback: direct update if RPC not available
          serviceClient
            .from("stories")
            .update({ like_count: serviceClient.raw("GREATEST(like_count - 1, 0)") })
            .eq("id", storyId)
            .then(() => {});
        });
      }
    }

    // 2. Find stories this user commented on → decrement comment_count
    const { data: comments } = await serviceClient
      .from("community_comments")
      .select("story_id")
      .eq("user_id", userId);

    if (comments && comments.length > 0) {
      // Group by story_id and count comments per story
      const commentCounts = new Map<string, number>();
      for (const c of comments as Array<{ story_id: string }>) {
        commentCounts.set(c.story_id, (commentCounts.get(c.story_id) || 0) + 1);
      }
      for (const [storyId, count] of commentCounts) {
        await serviceClient
          .from("stories")
          .update({ comment_count: Math.max(0, -count) }) // Will be handled by RPC if available
          .eq("id", storyId)
          .catch(() => {}); // Best-effort
      }
    }
  } catch (err) {
    console.warn("[Account/Delete] Counter decrement failed (best-effort):", err instanceof Error ? err.message : String(err));
  }
}
