import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

// GDPR Art. 17: Right to Erasure
// JP-06: Require confirmation body to prevent CSRF-style abuse
export async function DELETE(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
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
  if (body?.confirm !== "DELETE_MY_ACCOUNT") {
    return NextResponse.json({ error: "삭제 확인이 필요합니다. confirm: 'DELETE_MY_ACCOUNT'를 전송해 주세요." }, { status: 400 });
  }

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return sb.applyCookies(NextResponse.json({ error: "서비스를 사용할 수 없습니다." }, { status: 503 }));
  }

  const userId = user.id;

  try {
    // CTO-FIX: Delete ALL user data with error tracking per table
    // Non-transactional — track failures to ensure partial deletes are logged
    const maskedId = userId.slice(0, 8) + "…";

    // R4-FIX(A1): Phase 0 — Delete cross-user references to this user's content.
    // Other users' likes/comments/reports may reference this user's stories/comments.
    // Without cleanup, FK RESTRICT constraints block deletion → orphaned data (GDPR Art.17).
    try {
      const { data: userStoryRows } = await serviceClient
        .from("stories").select("id").eq("user_id", userId).limit(500);
      const storyIds = (userStoryRows || []).map((s: { id: string }) => s.id);

      if (storyIds.length > 0) {
        // Comments on this user's stories may have reports → delete reports first
        const { data: storyCommentRows } = await serviceClient
          .from("comments").select("id").in("story_id", storyIds).limit(5000);
        const storyCommentIds = (storyCommentRows || []).map((c: { id: string }) => c.id);
        if (storyCommentIds.length > 0) {
          const { error: crErr } = await serviceClient.from("comment_reports").delete().in("comment_id", storyCommentIds);
          if (crErr) console.error(`[Account] Phase0 story-comment reports cleanup failed: ${crErr.code}`);
        }
        // Delete other users' comments and likes on this user's stories
        const { error: cErr } = await serviceClient.from("comments").delete().in("story_id", storyIds);
        if (cErr) console.error(`[Account] Phase0 story comments cleanup failed: ${cErr.code}`);
        const { error: lErr } = await serviceClient.from("likes").delete().in("story_id", storyIds);
        if (lErr) console.error(`[Account] Phase0 story likes cleanup failed: ${lErr.code}`);
      }

      // Delete reports on THIS user's comments (filed by other reporters)
      const { data: userCommentRows } = await serviceClient
        .from("comments").select("id").eq("user_id", userId).limit(5000);
      const commentIds = (userCommentRows || []).map((c: { id: string }) => c.id);
      if (commentIds.length > 0) {
        const { error: crErr2 } = await serviceClient.from("comment_reports").delete().in("comment_id", commentIds);
        if (crErr2) console.error(`[Account] Phase0 user-comment reports cleanup failed: ${crErr2.code}`);
      }
    } catch (phase0Err) {
      console.error(`[Account] Phase0 cross-ref cleanup error for user=${maskedId}:`, phase0Err instanceof Error ? phase0Err.message : "Unknown");
      // Continue — Phase 1/2 may still succeed if DB uses CASCADE
    }

    // Phase 1: Delete this user's own non-dependent records (can run in parallel)
    // P1-FIX: Added "user_reviews" to prevent orphaned review records after account deletion
    const phase1Tables = ["comment_reports", "likes", "feedback", "comments", "user_reviews"] as const;
    const phase1Results = await Promise.allSettled(
      phase1Tables.map(async (table) => {
        const col = table === "comment_reports" ? "reporter_id" : "user_id";
        const { error: err } = await serviceClient.from(table).delete().eq(col, userId);
        if (err) throw new Error(`${table}: ${err.code}`);
      })
    );
    phase1Results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(`[Account] Failed to delete ${phase1Tables[i]} for user=${maskedId}`);
      }
    });

    // Phase 2: Delete dependent records (sequential, dependency order)
    // LAUNCH-FIX: Add error logging for each step to detect orphaned data
    const { error: storiesErr } = await serviceClient.from("stories").delete().eq("user_id", userId);
    if (storiesErr) console.error(`[Account] Stories delete failed for user=${maskedId}: ${storiesErr.code}`);
    const { error: subsErr } = await serviceClient.from("subscriptions").delete().eq("user_id", userId);
    if (subsErr) console.error(`[Account] Subscriptions delete failed for user=${maskedId}: ${subsErr.code}`);
    const { error: profileErr } = await serviceClient.from("profiles").delete().eq("id", userId);
    if (profileErr) console.error(`[Account] Profile delete failed for user=${maskedId}: ${profileErr.code}`);

    // Delete auth user
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[Account] Delete auth error:", deleteError.name, "user=", maskedId);
      return sb.applyCookies(NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 }));
    }

    console.log(`[Account] Successfully deleted user=${maskedId}`);
    return sb.applyCookies(NextResponse.json({ success: true, message: "계정이 삭제되었습니다." }));
  } catch (e) {
    console.error("[Account] Delete error:", e instanceof Error ? e.name : "Unknown");
    return sb.applyCookies(NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 }));
  }
}
