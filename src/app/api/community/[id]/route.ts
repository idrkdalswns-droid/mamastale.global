import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

/** Anon-key client for public reads — RLS enforced */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

// GET: Fetch a single public story
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: story, error } = await supabase
    .from("stories")
    .select("id, title, scenes, author_alias, view_count, like_count, comment_count, created_at")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Atomic view count increment — uses service role for RPC
  const serviceClient = createServiceRoleClient();
  if (serviceClient) {
    await serviceClient.rpc("increment_story_counter", {
      p_story_id: id,
      p_column: "view_count",
      p_delta: 1,
    });
  }

  return NextResponse.json({ story });
}
