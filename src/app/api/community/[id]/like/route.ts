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

// POST: Toggle like (authenticated) or guest like (no auth)
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

  // Guest like — just increment counter, no DB record
  if (!user) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
    }
    return NextResponse.json({ liked: true, guest: true });
  }

  // Authenticated user — toggle like
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  // Use service role for atomic counter updates
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const serviceClient = createServiceRoleClient();

  if (existing) {
    // Unlike
    await supabase.from("likes").delete().eq("id", existing.id);

    // Atomic decrement
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: -1,
      });
    }

    return NextResponse.json({ liked: false });
  } else {
    // Like
    await supabase.from("likes").insert({
      user_id: user.id,
      story_id: storyId,
    });

    // Atomic increment
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
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
    // Guest — like status tracked by client localStorage
    return NextResponse.json({ liked: false, guest: true });
  }

  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  return NextResponse.json({ liked: !!data });
}
