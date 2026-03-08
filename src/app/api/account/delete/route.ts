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

    // Phase 1: Delete non-dependent records (can run in parallel)
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
