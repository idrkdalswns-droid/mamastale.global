import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sanitizeSearchQuery, parsePagination } from "@/lib/utils/search";
import { getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

// R4-FIX: Rate limit community listing (prevent scraping/enumeration)
const communityRateMap = new Map<string, { count: number; resetAt: number }>();
function checkCommunityRate(ip: string): boolean {
  const now = Date.now();
  if (communityRateMap.size > 300) {
    for (const [k, v] of communityRateMap) { if (now > v.resetAt) communityRateMap.delete(k); }
  }
  const entry = communityRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    communityRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

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
  const ip = getClientIP(request);
  if (!checkCommunityRate(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "recent";
  const topic = searchParams.get("topic") || "";
  const search = searchParams.get("search") || "";
  const { page, limit, offset } = parsePagination(searchParams.get("page"));

  let query = supabase
    .from("stories")
    .select("id, title, scenes, author_alias, topic, cover_image, view_count, like_count, created_at", { count: "exact" })
    .eq("is_public", true)
    .eq("status", "completed");

  if (topic && topic.length <= 50) {
    query = query.eq("topic", topic);
  }

  // Search: match title or author_alias (sanitized, max 100 chars)
  const safeSearch = sanitizeSearchQuery(search);
  if (safeSearch) {
    query = query.or(`title.ilike.%${safeSearch}%,author_alias.ilike.%${safeSearch}%`);
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

  return NextResponse.json({
    stories: stories || [],
    total,
    totalCount: total, // frontend compatibility alias
    page,
    hasMore: total > offset + limit,
  });
}
