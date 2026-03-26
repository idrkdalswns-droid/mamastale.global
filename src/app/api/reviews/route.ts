import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
// CA-1/CA-2: Use shared utilities instead of local duplicates
import { sanitizeText, containsProfanity, getClientIP } from "@/lib/utils/validation";
// HIGH #4 FIX: Use authenticated client to require login for review submission
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

const reviewSchema = z.object({
  authorAlias: z.string().min(1).max(20),
  childInfo: z.string().max(30).optional().nullable(),
  stars: z.number().int().min(1).max(5),
  content: z.string().min(1).max(500),
});

// ─── Rate limiters (each has its own isolated Map) ───
const reviewPostLimiter = createInMemoryLimiter(RATE_KEYS.REVIEW_POST, { maxEntries: 300 });
const reviewGetLimiter = createInMemoryLimiter(RATE_KEYS.REVIEW_GET, { maxEntries: 300 });

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

// GET: List reviews (R8-FIX: rate limited)
export async function GET(request: NextRequest) {
  const readIp = getClientIP(request);
  if (!reviewGetLimiter.check(readIp, 30, 60_000)) {
    return NextResponse.json({ reviews: [] });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ reviews: [] });
  }

  const { data: reviews } = await supabase
    .from("user_reviews")
    .select("id, author_alias, child_info, stars, content, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ reviews: reviews || [] });
}

// POST: Submit review (authenticated + rate-limited)
// HIGH #4 FIX: Require authentication to prevent unauthenticated review spam
export async function POST(request: NextRequest) {
  // Rate limiting (kept as secondary defense even with auth)
  const ip = getClientIP(request);
  if (!reviewPostLimiter.check(ip, 3, 300_000)) {
    return NextResponse.json(
      { error: "후기는 5분에 3건까지 등록 가능합니다." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // HIGH #4 FIX: Authenticate user — only logged-in users can submit reviews
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인 후 후기를 작성할 수 있습니다." }, { status: 401 })
    );
  }

  // LAUNCH-FIX: Body size limit (reviews are small text, 16KB max)
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 16_000) {
    return sb.applyCookies(NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 }));
  }

  // Safe JSON parsing
  let body;
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
  }

  try {
    const { authorAlias, childInfo, stars, content } = parsed.data;

    const safeContent = sanitizeText(content.trim().slice(0, 500));
    const safeAlias = sanitizeText(authorAlias.trim().slice(0, 20));
    const safeChildInfo = childInfo ? sanitizeText(childInfo.trim().slice(0, 30)) : null;
    const safeStars = stars;

    // LAUNCH-FIX: Check childInfo for profanity too (visible in community)
    if (containsProfanity(safeContent) || containsProfanity(safeAlias) || (safeChildInfo && containsProfanity(safeChildInfo))) {
      return sb.applyCookies(NextResponse.json(
        { error: "부적절한 표현이 포함되어 있습니다." },
        { status: 400 }
      ));
    }

    // P0-FIX: Use authenticated client (sb.client) instead of anon client
    // Anon client may fail INSERT under RLS policies that require user context
    const { data, error } = await sb.client
      .from("user_reviews")
      .insert({
        user_id: user.id,
        author_alias: safeAlias,
        child_info: safeChildInfo,
        stars: safeStars,
        content: safeContent,
      })
      .select("id, author_alias, child_info, stars, content, created_at")
      .single();

    if (error) {
      console.error("[Reviews] Insert error: code=", error.code);
      return sb.applyCookies(NextResponse.json({ error: "후기 등록에 실패했습니다." }, { status: 500 }));
    }

    return sb.applyCookies(NextResponse.json({ review: data }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }));
  }
}
