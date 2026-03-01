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

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: "서비스를 사용할 수 없습니다." }, { status: 503 });
  }

  const userId = user.id;

  try {
    // JP-04: Delete ALL user data in dependency order (all tables)
    await serviceClient.from("comment_reports").delete().eq("reporter_id", userId);
    await serviceClient.from("likes").delete().eq("user_id", userId);
    await serviceClient.from("feedback").delete().eq("user_id", userId);
    await serviceClient.from("comments").delete().eq("user_id", userId);
    await serviceClient.from("stories").delete().eq("user_id", userId);
    await serviceClient.from("referrals").delete().eq("referrer_id", userId);
    await serviceClient.from("referrals").delete().eq("referred_id", userId);
    await serviceClient.from("subscriptions").delete().eq("user_id", userId);
    await serviceClient.from("profiles").delete().eq("id", userId);

    // Delete auth user
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[Account] Delete auth error:", deleteError.name);
      return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "계정이 삭제되었습니다." });
  } catch (e) {
    console.error("[Account] Delete error:", e instanceof Error ? e.name : "Unknown");
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }
}
