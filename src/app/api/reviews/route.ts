import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
// CA-1/CA-2: Use shared utilities instead of local duplicates
import { sanitizeText, containsProfanity, getClientIP } from "@/lib/utils/validation";
// HIGH #4 FIX: Use authenticated client to require login for review submission
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// ─── Rate limiting (per-IP, per-isolate) ───
const REVIEW_RATE_WINDOW = 300_000; // 5 minutes
const REVIEW_RATE_LIMIT = 3; // max 3 reviews per 5 minutes per IP
const reviewRateMap = new Map<string, { count: number; resetAt: number }>();

function checkReviewRateLimit(ip: string): boolean {
  const now = Date.now();
  if (reviewRateMap.size > 300) {
    for (const [k, v] of reviewRateMap) {
      if (now > v.resetAt) reviewRateMap.delete(k);
    }
  }
  const entry = reviewRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    reviewRateMap.set(ip, { count: 1, resetAt: now + REVIEW_RATE_WINDOW });
    return true;
  }
  if (entry.count >= REVIEW_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

// GET: List reviews
export async function GET() {
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
  if (!checkReviewRateLimit(ip)) {
    return NextResponse.json(
      { error: "후기는 5분에 3건까지 등록 가능합니다." },
      { status: 429 }
    );
  }

  // HIGH #4 FIX: Authenticate user — only logged-in users can submit reviews
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
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

  try {
    const { authorAlias, childInfo, stars, content } = body;

    if (!content?.trim()) {
      return sb.applyCookies(NextResponse.json({ error: "후기 내용을 입력해 주세요" }, { status: 400 }));
    }
    if (!authorAlias?.trim()) {
      return sb.applyCookies(NextResponse.json({ error: "별명을 입력해 주세요" }, { status: 400 }));
    }

    const safeContent = sanitizeText(content.trim().slice(0, 500));
    const safeAlias = sanitizeText(authorAlias.trim().slice(0, 20));
    const safeChildInfo = childInfo ? sanitizeText(childInfo.trim().slice(0, 30)) : null;
    const parsedStars = Number.isFinite(Number(stars)) ? Math.round(Number(stars)) : 5;
    const safeStars = Math.min(5, Math.max(1, parsedStars));

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
