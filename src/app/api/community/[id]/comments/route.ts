import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { isValidUUID, sanitizeText, containsProfanity, getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

const commentSchema = z.object({
  content: z.string().min(1).max(500),
  authorAlias: z.string().max(50).optional().nullable(),
});

const commentGetLimiter = createInMemoryLimiter(RATE_KEYS.COMMENT_GET);
const commentPostLimiter = createInMemoryLimiter(RATE_KEYS.COMMENT_POST);

/** Anon-key client for public reads — RLS enforced */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

// GET: List comments for a story (only if story is public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // R6-FIX: Rate limit comment reads (30/min per IP)
  const readIp = getClientIP(request);
  if (!commentGetLimiter.check(readIp, 30, 60_000)) {
    return NextResponse.json({ comments: [] });
  }

  const { id: storyId } = await params;

  if (!isValidUUID(storyId)) {
    return NextResponse.json({ comments: [] });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ comments: [] });
  }

  // Verify the story is public before returning its comments
  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("is_public", true)
    .single();

  if (!story) {
    return NextResponse.json({ comments: [] });
  }

  // R10-5: Fetch limit+1 to detect hasMore without separate count query
  const COMMENT_LIMIT = 20;
  const page = Math.max(1, parseInt(new URL(request.url).searchParams.get("page") || "1"));
  const offset = (page - 1) * COMMENT_LIMIT;
  const { data: comments } = await supabase
    .from("comments")
    .select("id, content, author_alias, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true })
    .range(offset, offset + COMMENT_LIMIT);

  const results = comments || [];
  const hasMore = results.length > COMMENT_LIMIT;

  return NextResponse.json({
    comments: hasMore ? results.slice(0, COMMENT_LIMIT) : results,
    hasMore,
  });
}

// POST: Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // P1-FIX: Rate limit comment submissions (5/min per IP)
  const ip = getClientIP(request);
  if (!commentPostLimiter.check(ip, 5, 60_000)) {
    return NextResponse.json(
      { error: "댓글은 1분에 5개까지 등록 가능합니다." },
      { status: 429 }
    );
  }

  const { id: storyId } = await params;

  if (!isValidUUID(storyId)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  // Use createApiSupabaseClient to preserve session cookies on auth refresh
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 }));
  }

  // R2-3: Rate limit by userId (prevents IP rotation bypass)
  if (!commentPostLimiter.check(`user:${user.id}`, 5, 60_000)) {
    return sb.applyCookies(NextResponse.json(
      { error: "댓글은 1분에 5개까지 등록 가능합니다." },
      { status: 429 }
    ));
  }

  // Verify story is public before allowing comments
  const anonClient = createAnonClient();
  if (anonClient) {
    const { data: story } = await anonClient
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .eq("is_public", true)
      .single();
    if (!story) {
      return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
    }
  }

  try {
    // LAUNCH-FIX: Body size limit (comments are small text, 8KB max)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 8_000) {
      return sb.applyCookies(NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 }));
    }

    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
    }

    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
    }

    const { content, authorAlias } = parsed.data;

    // Sanitize inputs (strip HTML tags, JS protocol)
    const safeContent = sanitizeText(content.trim().slice(0, 500));
    const safeAlias = sanitizeText(
      (authorAlias || user.user_metadata?.name || "익명").slice(0, 50)
    );

    // Profanity check
    if (containsProfanity(safeContent) || containsProfanity(safeAlias)) {
      return sb.applyCookies(NextResponse.json(
        { error: "부적절한 표현이 포함되어 있습니다." },
        { status: 400 }
      ));
    }

    const { data, error } = await sb.client
      .from("comments")
      .insert({
        user_id: user.id,
        story_id: storyId,
        content: safeContent,
        author_alias: safeAlias,
      })
      .select("id, content, author_alias, created_at")
      .single();

    if (error) {
      console.error("[Comments] Insert error: code=", error.code);
      return sb.applyCookies(NextResponse.json({ error: "댓글 등록에 실패했습니다." }, { status: 500 }));
    }

    // IN-6: Atomic comment count increment with error logging
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      const { error: rpcError } = await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "comment_count",
        p_delta: 1,
      });
      if (rpcError) {
        console.error("[Comments] Counter increment failed: code=", rpcError.code);
      }
    }

    return sb.applyCookies(NextResponse.json({ comment: data }));
  } catch (unknownErr) {
    // R8-5: Log unexpected errors for production debugging (was silently swallowed)
    console.error("[Comments] Unexpected error:", unknownErr instanceof Error ? unknownErr.message : String(unknownErr));
    return sb.applyCookies(NextResponse.json({ error: "댓글 처리 중 오류가 발생했습니다." }, { status: 500 }));
  }
}
