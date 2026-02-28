import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

// GET: Fetch a single public story
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createServiceRoleClient();
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

  // Increment view count
  await supabase
    .from("stories")
    .update({ view_count: (story.view_count || 0) + 1 })
    .eq("id", id);

  return NextResponse.json({ story });
}
