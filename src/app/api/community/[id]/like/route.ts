import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

// POST: Toggle like (add or remove)
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

  // Check if already liked
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  if (existing) {
    // Unlike
    await supabase.from("likes").delete().eq("id", existing.id);

    // Decrement counter
    const { data: story } = await supabase
      .from("stories")
      .select("like_count")
      .eq("id", storyId)
      .single();

    if (story) {
      await supabase
        .from("stories")
        .update({ like_count: Math.max(0, (story.like_count || 1) - 1) })
        .eq("id", storyId);
    }

    return NextResponse.json({ liked: false });
  } else {
    // Like
    await supabase.from("likes").insert({
      user_id: user.id,
      story_id: storyId,
    });

    // Increment counter
    const { data: story } = await supabase
      .from("stories")
      .select("like_count")
      .eq("id", storyId)
      .single();

    if (story) {
      await supabase
        .from("stories")
        .update({ like_count: (story.like_count || 0) + 1 })
        .eq("id", storyId);
    }

    return NextResponse.json({ liked: true });
  }
}

// GET: Check if current user liked this story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  const supabase = getSupabaseClient(request);
  if (!supabase) {
    return NextResponse.json({ liked: false });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ liked: false });
  }

  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  return NextResponse.json({ liked: !!data });
}
