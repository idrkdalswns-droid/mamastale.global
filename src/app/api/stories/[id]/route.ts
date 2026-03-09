import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { sanitizeText, sanitizeSceneText, containsProfanity, isValidUUID, VALID_TOPICS } from "@/lib/utils/validation";

export const runtime = "edge";

// R4-FIX: Rate limit GET/PATCH per user (prevent rapid polling / DB write abuse)
const storyDetailRateMap = new Map<string, { count: number; resetAt: number }>();
function checkStoryDetailRate(userId: string): boolean {
  const now = Date.now();
  if (storyDetailRateMap.size > 300) {
    for (const [k, v] of storyDetailRateMap) { if (now > v.resetAt) storyDetailRateMap.delete(k); }
  }
  const entry = storyDetailRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    storyDetailRateMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false; // 30/min per user
  entry.count++;
  return true;
}

const storyPatchRateMap = new Map<string, { count: number; resetAt: number }>();
function checkStoryPatchRate(userId: string): boolean {
  const now = Date.now();
  if (storyPatchRateMap.size > 300) {
    for (const [k, v] of storyPatchRateMap) { if (now > v.resetAt) storyPatchRateMap.delete(k); }
  }
  const entry = storyPatchRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    storyPatchRateMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false; // 10 PATCH/min per user
  entry.count++;
  return true;
}

/** Try cookie auth first, then fallback to Authorization bearer token */
async function resolveUser(sb: NonNullable<ReturnType<typeof createApiSupabaseClient>>, request: NextRequest) {
  const { data, error } = await sb.client.auth.getUser();
  if (data.user) return data.user;

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: tokenData } = await sb.client.auth.getUser(token);
    if (tokenData.user) return tokenData.user;
  }

  return null;
}

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

  const user = await resolveUser(sb, request);
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // R4-FIX: Rate limit individual story GET (30/min per user)
  if (!checkStoryDetailRate(user.id)) {
    return sb.applyCookies(NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 }));
  }

  const { data: story, error } = await sb.client
    .from("stories")
    // R10-2: Exclude metadata from client response (least-privilege; metadata contains internal fields)
    .select("id, title, scenes, status, is_public, author_alias, cover_image, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !story) {
    return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
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

  const user = await resolveUser(sb, request);
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  // R4-FIX: Rate limit PATCH (10/min per user to prevent DB write abuse)
  if (!checkStoryPatchRate(user.id)) {
    return sb.applyCookies(NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 }));
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
    // Cover image selection — whitelist to /images/covers/ only
    if (typeof body.coverImage === "string") {
      if (/^\/images\/covers\/cover_(pink|green|blue)\d{2}\.(png|jpeg)$/.test(body.coverImage)) {
        updates.cover_image = body.coverImage;
      }
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
        updates.scenes = body.scenes;
      }
    }

    if (Object.keys(updates).length === 0) {
      return sb.applyCookies(NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 }));
    }

    const { data: updated, error } = await sb.client
      .from("stories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[Stories] Update error: code=", error.code);
      return sb.applyCookies(NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 }));
    }

    if (!updated) {
      return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }));
  }
}
