import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { isValidUUID, sanitizeText, sanitizeSceneText, containsProfanity, isValidCoverImage, VALID_TOPICS } from "@/lib/utils/validation";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { calculateBlindStatus, applyBlindFilter } from "@/lib/utils/blind";
import { t } from "@/lib/i18n";

const storyPatchSchema = z.object({
  isPublic: z.boolean().optional(),
  authorAlias: z.string().transform(s => s.trim().slice(0, 50)).optional(),
  title: z.string().transform(s => s.trim().slice(0, 200)).optional(),
  topic: z.string().optional(),
  coverImage: z.string().optional(),
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    title: z.string().transform(s => s.slice(0, 200)),
    text: z.string().transform(s => s.slice(0, 5000)),
  })).min(1).max(20).optional(),
}).strict();

export const runtime = "edge";



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: t("Errors.validation.invalidIdFormat") }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  // T-2: Persistent rate limit (30/min per user, survives across Edge isolates)
  const getAllowed = await checkRateLimitPersistent(`story_get:${user.id}`, 30, 60);
  if (!getAllowed) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.rateLimit.tooManyRequests") }, { status: 429, headers: { "Retry-After": "60" } }));
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
    return sb.applyCookies(NextResponse.json({ error: t("Errors.story.notFound") }, { status: 404 }));
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
    return NextResponse.json({ error: t("Errors.validation.invalidIdFormat") }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  // T-2: Persistent rate limit (10 PATCH/min per user)
  const patchAllowed = await checkRateLimitPersistent(`story_patch:${user.id}`, 10, 60);
  if (!patchAllowed) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.rateLimit.tooManyRequests") }, { status: 429, headers: { "Retry-After": "60" } }));
  }

  try {
    // P1-FIX: Body size limit on PATCH (parity with POST endpoint)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 512_000) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.requestTooLarge") }, { status: 413 }));
    }

    // Safe JSON parsing (KR-T1 fix)
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 }));
    }
    // Zod 스키마로 입력 검증 (truncate 동작 유지)
    const parsed = storyPatchSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 }));
    }
    const { isPublic, authorAlias, title, topic, coverImage, scenes } = parsed.data;
    const updates: Record<string, unknown> = {};

    if (isPublic !== undefined) updates.is_public = isPublic;
    if (authorAlias !== undefined) {
      const safeAlias = sanitizeText(authorAlias);
      if (safeAlias && containsProfanity(safeAlias)) {
        return sb.applyCookies(NextResponse.json({ error: t("Errors.profanity.alias") }, { status: 400 }));
      }
      updates.author_alias = safeAlias || null;
    }
    if (title !== undefined) {
      const safeTitle = sanitizeText(title);
      if (safeTitle && containsProfanity(safeTitle)) {
        return sb.applyCookies(NextResponse.json({ error: t("Errors.profanity.title") }, { status: 400 }));
      }
      updates.title = safeTitle;
    }
    if (topic !== undefined) {
      if ((VALID_TOPICS as readonly string[]).includes(topic)) {
        updates.topic = topic;
      } else if (topic === "") {
        updates.topic = null;
      }
    }
    if (coverImage !== undefined && isValidCoverImage(coverImage)) {
      updates.cover_image = coverImage;
    }
    if (scenes !== undefined) {
      const sanitizedScenes = scenes.map(s => ({
        ...s,
        title: sanitizeSceneText(s.title),
        text: sanitizeSceneText(s.text),
      }));
      if (sanitizedScenes.some(s => containsProfanity(s.text))) {
        return sb.applyCookies(NextResponse.json({ error: t("Errors.profanity.content") }, { status: 400 }));
      }
      updates.scenes = sanitizedScenes;
    }

    if (Object.keys(updates).length === 0) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.story.noChanges") }, { status: 400 }));
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
      return sb.applyCookies(NextResponse.json({ error: t("Errors.story.updateFailed") }, { status: 500 }));
    }

    if (!updated) {
      // If publishing a locked story, CAS guard returns 0 rows → 403
      if (body.isPublic === true) {
        return sb.applyCookies(NextResponse.json({ error: t("Errors.story.unlockRequired") }, { status: 403 }));
      }
      return sb.applyCookies(NextResponse.json({ error: t("Errors.story.notFound") }, { status: 404 }));
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 }));
  }
}

// DELETE: Soft-delete a story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: t("Errors.validation.invalidIdFormat") }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  // H1-FIX: Rate limit with persistent limiter (data destruction = persistent, not in-memory)
  const deleteAllowed = await checkRateLimitPersistent(`story_delete:${user.id}`, 5, 60);
  if (!deleteAllowed) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.rateLimit.tooManyRequests") }, { status: 429, headers: { "Retry-After": "60" } }));
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
    return sb.applyCookies(NextResponse.json({ error: t("Errors.story.deleteFailed") }, { status: 500 }));
  }

  if (!deleted) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.story.notFound") }, { status: 404 }));
  }

  return sb.applyCookies(NextResponse.json({ success: true }));
}
