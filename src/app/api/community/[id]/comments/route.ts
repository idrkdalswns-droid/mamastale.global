import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

function getSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });
}

// GET: List comments for a story
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ comments: [] });
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("id, content, author_alias, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({ comments: comments || [] });
}

// POST: Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  const supabase = getSupabaseClient(request);
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const { content, authorAlias } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        story_id: storyId,
        content: content.trim().slice(0, 500),
        author_alias: authorAlias || user.user_metadata?.name || "익명",
      })
      .select("id, content, author_alias, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment comment count
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      const { data: story } = await serviceClient
        .from("stories")
        .select("comment_count")
        .eq("id", storyId)
        .single();

      if (story) {
        await serviceClient
          .from("stories")
          .update({ comment_count: (story.comment_count || 0) + 1 })
          .eq("id", storyId);
      }
    }

    return NextResponse.json({ comment: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
