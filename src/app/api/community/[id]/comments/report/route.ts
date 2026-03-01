import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isValidUUID } from "@/lib/utils/validation";

export const runtime = "edge";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  if (!isValidUUID(storyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { commentId } = body;
    if (!commentId || !isValidUUID(commentId)) {
      return NextResponse.json({ error: "commentId 필요" }, { status: 400 });
    }

    // IL-11: Verify comment belongs to the specified story
    const { data: comment } = await supabase
      .from("comments")
      .select("id")
      .eq("id", commentId)
      .eq("story_id", storyId)
      .maybeSingle();

    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    // Insert report (ignore duplicate via ON CONFLICT)
    await supabase
      .from("comment_reports")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        story_id: storyId,
      });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "신고 처리 실패" }, { status: 500 });
  }
}
