import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { isValidUUID, sanitizeText, sanitizeSceneText, containsProfanity, isValidCoverImage, VALID_TOPICS } from "@/lib/utils/validation";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { calculateBlindStatus, applyBlindFilter } from "@/lib/utils/blind";

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
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // T-2: Persistent rate limit (30/min per user, survives across Edge isolates)
  const getAllowed = await checkRateLimitPersistent(`story_get:${user.id}`, 30, 60);
  if (!getAllowed) {
    return sb.applyCookies(NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } }));
  }

  const { data: story, error } = await sb.client
    .from("stories")
    // R10-2: Include metadata for source detection, but only expose source field to client
    // Freemium v2: include is_unlocked for lock filtering
    // DIY free save: include expires_at for lock check
    .select("id, title, scenes, status, is_public, is_unlocked, author_alias, topic, cover_image, metadata, expires_at, blind_until, story_type, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !story) {
    return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
  }

  // DIY free save + blind system: check purchase flags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storyAny = story as any;
  let hasPurchased = false;
  let hasEverPurchased = false;
  try {
    const { data: profile } = await sb.client
      .from("profiles")
      .select("has_purchased, has_ever_purchased")
      .eq("id", user.id)
      .single();
    hasPurchased = profile?.has_purchased === true;
    hasEverPurchased = profile?.has_ever_purchased === true;
  } catch {
    // fallback: not purchased
  }

  let is_locked = false;
  if (storyAny.expires_at && new Date(storyAny.expires_at).getTime() < Date.now()) {
    if (!hasPurchased && !storyAny.is_public) {
      is_locked = true;
    }
  }

  // Blind system
  const is_blinded = calculateBlindStatus(
    { blind_until: storyAny.blind_until },
    { has_ever_purchased: hasEverPurchased }
  );

  // Extract source from metadata, don't expose raw metadata to client
  const { metadata, expires_at, blind_until, ...storyFields } = story as Record<string, unknown>;
  const isUnlocked = (storyFields.is_unlocked as boolean | null) ?? true; // backward compat: missing = unlocked
  const allScenes = Array.isArray(storyFields.scenes) ? storyFields.scenes : [];
  const totalScenes = allScenes.length;

  // DIY free save: locked expired stories return empty scenes
  // Freemium v2: locked stories only expose first 6 scenes (server-side filtering)
  // Blind system: blinded stories show 6 scenes, text stripped from rest
  let visibleScenes;
  if (is_locked) {
    visibleScenes = [];
  } else if (is_blinded) {
    visibleScenes = applyBlindFilter(allScenes as { text: string }[], true);
  } else if (isUnlocked) {
    visibleScenes = allScenes;
  } else {
    visibleScenes = allScenes.slice(0, 6);
  }

  const safeStory = {
    ...storyFields,
    scenes: visibleScenes,
    total_scenes: totalScenes,
    is_unlocked: isUnlocked,
    source: (metadata as Record<string, unknown> | null)?.source || "ai",
    expires_at: expires_at || null,
    is_locked,
    is_blinded,
  };

  return sb.applyCookies(NextResponse.json({ story: safeStory }));
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
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // T-2: Persistent rate limit (10 PATCH/min per user)
  const patchAllowed = await checkRateLimitPersistent(`story_patch:${user.id}`, 10, 60);
  if (!patchAllowed) {
    return sb.applyCookies(NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } }));
  }

  try {
    // P1-FIX: Body size limit on PATCH (parity with POST endpoint)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 512_000) {
      return sb.applyCookies(NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 }));
    }

    // Safe JSON parsing (KR-T1 fix)
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
    }
    const updates: Record<string, unknown> = {};

    // Only allow specific fields to be updated
    if (typeof body.isPublic === "boolean") updates.is_public = body.isPublic;
    if (typeof body.authorAlias === "string") {
      const safeAlias = sanitizeText(body.authorAlias.trim().slice(0, 50));
      if (safeAlias && containsProfanity(safeAlias)) {
        return sb.applyCookies(NextResponse.json({ error: "부적절한 표현이 포함된 별명입니다." }, { status: 400 }));
      }
      updates.author_alias = safeAlias || null;
    }
    if (typeof body.title === "string") {
      const safeTitle = sanitizeText(body.title.trim().slice(0, 200));
      // SIM-FIX(S25): Profanity check on title updates (matches POST behavior)
      if (safeTitle && containsProfanity(safeTitle)) {
        return sb.applyCookies(NextResponse.json({ error: "부적절한 표현이 포함된 제목입니다." }, { status: 400 }));
      }
      updates.title = safeTitle;
    }
    // R2-FIX(B1): Allow topic update for community categorization
    if (typeof body.topic === "string") {
      if (VALID_TOPICS.includes(body.topic)) {
        updates.topic = body.topic;
      } else if (body.topic === "") {
        updates.topic = null;
      }
    }
    // Cover image selection — shared validation (static + AI-generated Supabase URLs)
    if (typeof body.coverImage === "string" && isValidCoverImage(body.coverImage)) {
      updates.cover_image = body.coverImage;
    }
    if (Array.isArray(body.scenes) && body.scenes.length > 0 && body.scenes.length <= 20) {
      const validScenes = body.scenes.every(
        (s: unknown) =>
          typeof s === "object" && s !== null &&
          typeof (s as Record<string, unknown>).sceneNumber === "number" &&
          typeof (s as Record<string, unknown>).title === "string" &&
          typeof (s as Record<string, unknown>).text === "string"
      );
      if (validScenes) {
        // Sanitize scene content — lightweight sanitizer for AI text
        for (const s of body.scenes as Array<{ title: string; text: string }>) {
          s.title = sanitizeSceneText(s.title.slice(0, 200));
          s.text = sanitizeSceneText(s.text.slice(0, 5000));
        }
        // P1-5: Profanity check on scene text (matches POST behavior)
        const hasProfanity = (body.scenes as Array<{ text: string }>).some(s => containsProfanity(s.text));
        if (hasProfanity) {
          return sb.applyCookies(NextResponse.json({ error: "부적절한 표현이 포함된 내용입니다." }, { status: 400 }));
        }
        updates.scenes = body.scenes;
      }
    }

    if (Object.keys(updates).length === 0) {
      return sb.applyCookies(NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 }));
    }

    // Bug Bounty: CAS guard — publishing requires is_unlocked=true (atomic, no TOCTOU)
    let query = sb.client
      .from("stories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);
    if (body.isPublic === true) {
      query = query.eq("is_unlocked", true);
    }
    const { data: updated, error } = await query.select("id").maybeSingle();

    if (error) {
      console.error("[Stories] Update error: code=", error.code);
      return sb.applyCookies(NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 }));
    }

    if (!updated) {
      // If publishing a locked story, CAS guard returns 0 rows → 403
      if (body.isPublic === true) {
        return sb.applyCookies(NextResponse.json({ error: "잠금 해제 후 공유할 수 있습니다." }, { status: 403 }));
      }
      return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }));
  }
}

// DELETE: Soft-delete a story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // H1-FIX: Rate limit with persistent limiter (data destruction = persistent, not in-memory)
  const deleteAllowed = await checkRateLimitPersistent(`story_delete:${user.id}`, 5, 60);
  if (!deleteAllowed) {
    return sb.applyCookies(NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } }));
  }

  // Soft delete: set status='deleted' and hide from community
  const { data: deleted, error } = await sb.client
    .from("stories")
    .update({ status: "deleted", is_public: false })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[Stories] Delete error: code=", error.code, "hint=", error.hint);
    return sb.applyCookies(NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 }));
  }

  if (!deleted) {
    return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
  }

  return sb.applyCookies(NextResponse.json({ success: true }));
}
