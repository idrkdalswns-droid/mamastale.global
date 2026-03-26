import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sanitizeSearchQuery, parsePagination } from "@/lib/utils/search";
import { getClientIP } from "@/lib/utils/validation";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

/** Anon-key client for public reads — RLS enforced */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

// GET: List public stories
export async function GET(request: NextRequest) {
  // T-2: Persistent rate limit (30/min per IP, survives across Edge isolates)
  const ip = getClientIP(request);
  const allowed = await checkRateLimitPersistent(`community:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "recent";
  const topic = searchParams.get("topic") || "";
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || ""; // 'showcase' | 'all' | '' (default: user only)
  const { page, limit, offset } = parsePagination(searchParams.get("page"));

  let query = supabase
    .from("stories")
    .select("id, title, scenes, author_alias, topic, cover_image, view_count, like_count, created_at, story_type, illustration_urls", { count: "exact" })
    .eq("is_public", true)
    .eq("status", "completed");

  // story_type 필터: 기본은 user 동화만, type=showcase면 showcase만, type=all이면 전부
  if (type === "showcase") {
    query = query.eq("story_type", "showcase");
  } else if (type === "all") {
    // 전부 표시 — 필터 없음
  } else {
    // 기본: showcase 제외 (기존 동화만)
    query = query.or("story_type.is.null,story_type.eq.user");
  }

  if (topic && topic.length <= 50) {
    query = query.eq("topic", topic);
  }

  // Sprint 2-F: Enhanced search — match title, author_alias, or topic
  const safeSearch = sanitizeSearchQuery(search);
  if (safeSearch) {
    const likeEscaped = safeSearch.replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(`title.ilike.%${likeEscaped}%,author_alias.ilike.%${likeEscaped}%,topic.ilike.%${likeEscaped}%`);
  }

  if (sort === "popular") {
    query = query.order("like_count", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: stories, count, error } = await query;

  if (error) {
    console.error("[Community] List error: code=", error.code);
    return NextResponse.json({ error: "동화 목록을 불러올 수 없습니다." }, { status: 500 });
  }

  const total = count || 0;

  // Sprint 7: CDN cache for public community feed
  const res = NextResponse.json({
    stories: stories || [],
    total,
    totalCount: total, // frontend compatibility alias
    page,
    hasMore: total > offset + limit,
  });
  res.headers.set("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  return res;
}
