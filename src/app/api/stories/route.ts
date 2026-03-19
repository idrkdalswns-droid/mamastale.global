import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { containsProfanity, sanitizeText, sanitizeSceneText, VALID_TOPICS, isValidCoverImage } from "@/lib/utils/validation";
import { generateCoverImage } from "@/lib/illustration/generate";
import { uploadCoverToStorage } from "@/lib/illustration/upload";

const storyPostSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    title: z.string().max(200),
    text: z.string().max(5000),
  })).min(1).max(20),
  sessionId: z.string().max(100).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  isPublic: z.boolean().optional(),
  authorAlias: z.string().max(50).optional().nullable(),
  coverImage: z.string().max(2048).optional().nullable(),
  topic: z.string().max(50).optional().nullable(),
});

export const runtime = "edge";

// P1-FIX(KR-1): Rate limit + size limits for story save endpoint
const STORY_SAVE_RATE_WINDOW_MS = 60_000;
const STORY_SAVE_RATE_LIMIT = 5; // Max 5 saves per minute per user
const MAX_BODY_SIZE = 512_000; // 512KB max request body

const storySaveRateMap = new Map<string, { count: number; resetAt: number }>();

// R4-FIX: Rate limit GET /api/stories (prevent enumeration)
const storyListRateMap = new Map<string, { count: number; resetAt: number }>();
function checkStoryListRate(userId: string): boolean {
  const now = Date.now();
  if (storyListRateMap.size > 200) {
    for (const [k, v] of storyListRateMap) { if (now > v.resetAt) storyListRateMap.delete(k); }
  }
  const entry = storyListRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    storyListRateMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
}

function checkStorySaveRate(userId: string): boolean {
  const now = Date.now();
  // Lazy cleanup
  if (storySaveRateMap.size > 200) {
    for (const [k, v] of storySaveRateMap) {
      if (now > v.resetAt) storySaveRateMap.delete(k);
    }
  }
  const entry = storySaveRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    storySaveRateMap.set(userId, { count: 1, resetAt: now + STORY_SAVE_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= STORY_SAVE_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/** Try cookie auth first, then fallback to Authorization bearer token */
async function resolveUser(sb: NonNullable<ReturnType<typeof createApiSupabaseClient>>, request: NextRequest) {
  const { data, error } = await sb.client.auth.getUser();
  if (data.user) return data.user;

  // Fallback: Authorization header (handles edge cookie issues)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: tokenData } = await sb.client.auth.getUser(token);
    if (tokenData.user) {
      console.warn("[Stories] Auth resolved via Bearer token fallback (cookie auth failed)");
      return tokenData.user;
    }
  }

  console.error("[Stories] Auth failed: cookie error=", error?.message, "| cookies count=", request.cookies.getAll().length);
  return null;
}

// GET: List user's stories
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const user = await resolveUser(sb, request);
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  if (!checkStoryListRate(user.id)) {
    return sb.applyCookies(NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 }));
  }

  const { data: stories, error } = await sb.client
    .from("stories")
    // R7-F1: Include cover_image, topic, metadata (for source detection)
    // Freemium v2: include is_unlocked for lock badge
    .select("id, title, scenes, status, is_public, is_unlocked, cover_image, topic, metadata, created_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[Stories] List error: code=", error.code);
    return sb.applyCookies(NextResponse.json({ error: "동화 목록을 불러올 수 없습니다." }, { status: 500 }));
  }

  // Extract source from metadata, don't expose raw metadata to client
  const safeStories = (stories || []).map(({ metadata, ...s }) => ({
    ...s,
    is_unlocked: s.is_unlocked ?? true, // backward compat: missing = unlocked
    source: (metadata as Record<string, unknown> | null)?.source || "ai",
  }));

  return sb.applyCookies(NextResponse.json({ stories: safeStories }));
}

// POST: Save a new story (with ticket check & deduction)
export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const user = await resolveUser(sb, request);
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // P1-FIX(KR-1): Rate limit per user
  if (!checkStorySaveRate(user.id)) {
    return sb.applyCookies(NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    ));
  }

  // P1-FIX(KR-2): Reject oversized request bodies to prevent memory exhaustion
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return sb.applyCookies(NextResponse.json(
      { error: "요청 데이터가 너무 큽니다." },
      { status: 413 }
    ));
  }

  try {
    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
    }

    // P1-FIX(KR-2): Double-check parsed body size (content-length can be spoofed)
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > MAX_BODY_SIZE) {
      return sb.applyCookies(NextResponse.json(
        { error: "요청 데이터가 너무 큽니다." },
        { status: 413 }
      ));
    }

    const parsed = storyPostSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
    }

    const { scenes, sessionId, metadata, isPublic, coverImage } = parsed.data;
    // Server-side input sanitization: enforce max lengths, strip HTML
    const title = typeof parsed.data.title === "string" ? sanitizeText(parsed.data.title.trim().slice(0, 200)) : "";
    const authorAlias = typeof parsed.data.authorAlias === "string" ? sanitizeText(parsed.data.authorAlias.trim().slice(0, 50)) : null;

    // UK-2/UK-3: Profanity check on title and alias (visible in community)
    if (title && containsProfanity(title)) {
      return sb.applyCookies(NextResponse.json({ error: "부적절한 표현이 포함된 제목입니다." }, { status: 400 }));
    }
    if (authorAlias && containsProfanity(authorAlias)) {
      return sb.applyCookies(NextResponse.json({ error: "부적절한 표현이 포함된 별명입니다." }, { status: 400 }));
    }

    // LAUNCH-FIX: Validate metadata is an object (not string/number/array)
    if (metadata !== undefined && metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 메타데이터 형식입니다." }, { status: 400 }));
    }
    // UK-5: Limit metadata size to prevent DB bloat
    if (metadata && JSON.stringify(metadata).length > 10_000) {
      return sb.applyCookies(NextResponse.json({ error: "메타데이터가 너무 큽니다." }, { status: 400 }));
    }

    // Sanitize scene content — use lightweight sanitizer for AI text
    // R2-FIX(A1): Scene titles also use sanitizeSceneText (not sanitizeText) to avoid
    // HTML entity double-encoding. React JSX auto-escapes on render, so entity-encoding
    // at DB save time causes "Tom &amp; Jerry" to display as "Tom &amp;amp; Jerry".
    for (const s of scenes as Array<{ sceneNumber: number; title: string; text: string }>) {
      s.title = sanitizeSceneText(s.title.slice(0, 200));
      s.text = sanitizeSceneText(s.text.slice(0, 5000));
    }

    // Ticket deduction is now handled upfront at /api/tickets/use (chat start).
    // This endpoint only saves the completed story.

    // Freemium v2: Determine if this is the user's first completed story
    // First story → is_unlocked=false (locked preview), subsequent → is_unlocked=true
    let isFirstStory = false;
    try {
      const { count, error: countErr } = await sb.client
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");
      if (!countErr && count !== null) {
        isFirstStory = count === 0;
      }
    } catch {
      // fallback: treat as not-first (unlocked) — safer than locking paid content
      isFirstStory = false;
    }

    // Validate session_id: must be a valid UUID or null
    // Client sends "session_${Date.now()}" which is NOT a UUID → skip FK
    const isValidUUID = sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

    // Build insert object — base columns only (always exist in DB)
    const storyInsert: Record<string, unknown> = {
      user_id: user.id,
      session_id: isValidUUID ? sessionId : null,
      title: title || "나의 마음 동화",
      scenes,
      metadata: metadata || {},
      status: "completed",
      // Freemium v2: first story is locked (preview only), subsequent are unlocked
      is_unlocked: !isFirstStory,
    };

    // DIY 동화: coverImage 저장 (공통 검증 함수 사용)
    if (typeof coverImage === "string" && coverImage.length > 0 && isValidCoverImage(coverImage)) {
      storyInsert.cover_image = coverImage;
    }

    // Community columns (is_public, author_alias) require 002_community migration
    // Only include if explicitly requested — graceful fallback if columns missing
    // R2-4: Strict boolean check to prevent truthy coercion (parity with PATCH handler)
    const hasCommunityFields = typeof isPublic === "boolean" || typeof authorAlias === "string";
    if (hasCommunityFields) {
      storyInsert.is_public = typeof isPublic === "boolean" ? isPublic : false;
      storyInsert.author_alias = authorAlias || null;
      // R2-FIX(B1): Save topic if valid (community topic filter support)
      if (typeof parsed.data.topic === "string" && VALID_TOPICS.includes(parsed.data.topic as typeof VALID_TOPICS[number])) {
        storyInsert.topic = parsed.data.topic;
      }
    }

    // Try insert
    let insertResult = await sb.client
      .from("stories")
      .insert(storyInsert)
      .select("id")
      .single();

    // If insert failed and we had community columns, retry without them
    // (community migration may not be applied yet)
    if (insertResult.error && hasCommunityFields) {
      console.warn("[Stories] Retrying without community columns:", insertResult.error.message);
      delete storyInsert.is_public;
      delete storyInsert.author_alias;
      insertResult = await sb.client
        .from("stories")
        .insert(storyInsert)
        .select("id")
        .single();
    }

    if (insertResult.error || !insertResult.data) {
      console.error("[Stories] Insert failed: code=", insertResult.error?.code);
      return sb.applyCookies(NextResponse.json({ error: "동화 저장에 실패했습니다." }, { status: 500 }));
    }

    const storyId = insertResult.data.id;
    let coverGenerated = false;

    // AI 표지 생성 후처리 (Freemium: 잠금 동화는 skip)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !isFirstStory && !storyInsert.cover_image) {
      try {
        const result = await generateCoverImage(scenes, title || "");
        if (result) {
          const publicUrl = await uploadCoverToStorage(result.base64, result.mimeType, storyId);
          if (publicUrl) {
            await sb.client.from("stories").update({ cover_image: publicUrl }).eq("id", storyId);
            coverGenerated = true;
          }
        }
      } catch (e) {
        console.error("[Stories] Cover generation failed (non-blocking):", e);
      }
    }

    return sb.applyCookies(NextResponse.json({ id: storyId, coverGenerated }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }));
  }
}
