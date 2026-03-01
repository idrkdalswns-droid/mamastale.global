import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

// GDPR Art. 17: Right to Erasure
export async function DELETE(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
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
    // Delete all user data in dependency order
    await serviceClient.from("comments").delete().eq("user_id", userId);
    await serviceClient.from("stories").delete().eq("user_id", userId);
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
