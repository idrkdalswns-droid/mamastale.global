import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { sanitizeText, containsProfanity, isValidUUID } from "@/lib/utils/validation";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: story, error } = await sb.client
    .from("stories")
    .select("id, title, scenes, metadata, status, is_public, author_alias, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 });
  }

  return sb.applyCookies(NextResponse.json({ story }));
}

// PATCH: Update story (e.g., share to community)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    // Safe JSON parsing (KR-T1 fix)
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};

    // Only allow specific fields to be updated
    if (typeof body.isPublic === "boolean") updates.is_public = body.isPublic;
    if (typeof body.authorAlias === "string") {
      const safeAlias = sanitizeText(body.authorAlias.trim().slice(0, 50));
      if (safeAlias && containsProfanity(safeAlias)) {
        return NextResponse.json({ error: "부적절한 표현이 포함된 별명입니다." }, { status: 400 });
      }
      updates.author_alias = safeAlias || null;
    }
    if (typeof body.title === "string") updates.title = sanitizeText(body.title.trim().slice(0, 200));
    if (Array.isArray(body.scenes) && body.scenes.length > 0 && body.scenes.length <= 20) {
      const validScenes = body.scenes.every(
        (s: unknown) =>
          typeof s === "object" && s !== null &&
          typeof (s as Record<string, unknown>).sceneNumber === "number" &&
          typeof (s as Record<string, unknown>).title === "string" &&
          typeof (s as Record<string, unknown>).text === "string"
      );
      if (validScenes) updates.scenes = body.scenes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });
    }

    const { error } = await sb.client
      .from("stories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Stories] Update error: code=", error.code);
      return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
}
