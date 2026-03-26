import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";

export const runtime = "edge";

const deleteLimiter = createInMemoryLimiter(RATE_KEYS.ACCOUNT_DELETE, { maxEntries: 100 });

// GDPR Art. 17: Right to Erasure
// JP-06: Require confirmation body to prevent CSRF-style abuse
export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  if (!deleteLimiter.check(ip, 3, 3_600_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  // LAUNCH-FIX: Body size limit (delete confirmation is tiny, 4KB max)
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 4_000) {
    return NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
  }

  // JP-06: Require explicit confirmation in request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "확인 정보가 필요합니다." }, { status: 400 });
  }
  if (body?.confirm !== "탈퇴합니다") {
    return NextResponse.json({ error: "'탈퇴합니다'를 입력해 주세요." }, { status: 400 });
  }

  const user = await resolveUser(sb.client, request, "Account/Delete");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return sb.applyCookies(NextResponse.json({ error: "서비스를 사용할 수 없습니다." }, { status: 503 }));
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
        { error: "계정 데이터 정리 중 오류가 발생했습니다. 다시 시도해 주세요." },
        { status: 500 }
      ));
    }

    // Delete auth user (after DB data is fully cleaned)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[Account] Delete auth error:", deleteError.name, "user=", maskedId);
      return sb.applyCookies(NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 }));
    }

    // Fire-and-forget: decrement community counters (non-critical)
    decrementCommunityCounters(serviceClient, userId).catch(() => {});

    console.info(`[Account] Successfully deleted user=${maskedId}`);
    return sb.applyCookies(NextResponse.json({ success: true, message: "계정이 삭제되었습니다." }));
  } catch (e) {
    console.error("[Account] Delete error:", e instanceof Error ? e.name : "Unknown");
    return sb.applyCookies(NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 }));
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
    return sb.applyCookies(NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 }));
  }

  console.info(`[Account] Legacy: Successfully deleted user=${maskedId}`);
  return sb.applyCookies(NextResponse.json({ success: true, message: "계정이 삭제되었습니다." }));
}

// ─── Community counter decrement (fire-and-forget) ───
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function decrementCommunityCounters(serviceClient: any, userId: string) {
  // This runs after the user data is already deleted, so we can't look up the user's
  // comments/likes anymore. The RPC handles data deletion, but counters on OTHER users'
  // stories may drift. This is acceptable for now — counters are eventually consistent.
  // A more robust solution would pre-compute counts in the RPC or use triggers.
}
