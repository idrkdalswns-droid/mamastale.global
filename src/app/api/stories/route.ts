import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { containsProfanity, sanitizeText, sanitizeSceneText, VALID_TOPICS } from "@/lib/utils/validation";

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
    // R7-F1: Include cover_image & topic for library carousel display
    .select("id, title, scenes, status, is_public, cover_image, topic, created_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[Stories] List error: code=", error.code);
    return sb.applyCookies(NextResponse.json({ error: "동화 목록을 불러올 수 없습니다." }, { status: 500 }));
  }

  return sb.applyCookies(NextResponse.json({ stories: stories || [] }));
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

    const { scenes, sessionId, metadata, isPublic } = body;
    // Server-side input sanitization: enforce max lengths, strip HTML
    const title = typeof body.title === "string" ? sanitizeText(body.title.trim().slice(0, 200)) : "";
    const authorAlias = typeof body.authorAlias === "string" ? sanitizeText(body.authorAlias.trim().slice(0, 50)) : null;

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

    // ─── Validate scenes BEFORE ticket deduction ───
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return sb.applyCookies(NextResponse.json({ error: "동화 장면 데이터가 필요합니다." }, { status: 400 }));
    }
    if (scenes.length > 20) {
      return sb.applyCookies(NextResponse.json({ error: "장면 수가 너무 많습니다." }, { status: 400 }));
    }
    const validScenes = scenes.every(
      (s: unknown) =>
        typeof s === "object" && s !== null &&
        typeof (s as Record<string, unknown>).sceneNumber === "number" &&
        typeof (s as Record<string, unknown>).title === "string" &&
        typeof (s as Record<string, unknown>).text === "string"
    );
    if (!validScenes) {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 동화 장면 데이터입니다." }, { status: 400 }));
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
    };

    // Community columns (is_public, author_alias) require 002_community migration
    // Only include if explicitly requested — graceful fallback if columns missing
    const hasCommunityFields = isPublic !== undefined || authorAlias;
    if (hasCommunityFields) {
      storyInsert.is_public = isPublic || false;
      storyInsert.author_alias = authorAlias || null;
      // R2-FIX(B1): Save topic if valid (community topic filter support)
      if (typeof body.topic === "string" && VALID_TOPICS.includes(body.topic)) {
        storyInsert.topic = body.topic;
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

    return sb.applyCookies(NextResponse.json({ id: insertResult.data.id }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }));
  }
}
