import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: story, error } = await sb.client
    .from("stories")
    .select("id, title, scenes, metadata, status, is_public, author_alias, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return sb.applyCookies(NextResponse.json({ story }));
}

// PATCH: Update story (e.g., share to community)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Only allow specific fields to be updated
    if (typeof body.isPublic === "boolean") updates.is_public = body.isPublic;
    if (typeof body.authorAlias === "string") updates.author_alias = body.authorAlias || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await sb.client
      .from("stories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Stories] Update error:", error.message);
      return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
