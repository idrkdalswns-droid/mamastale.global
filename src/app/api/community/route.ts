import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "recent";
  const topic = searchParams.get("topic") || "";
  const rawPage = parseInt(searchParams.get("page") || "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("stories")
    .select("id, title, scenes, author_alias, topic, view_count, like_count, created_at", { count: "exact" })
    .eq("is_public", true)
    .eq("status", "completed");

  if (topic) {
    query = query.eq("topic", topic);
  }

  if (sort === "popular") {
    query = query.order("like_count", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: stories, count, error } = await query;

  if (error) {
    console.error("[Community] List error:", error.message);
    return NextResponse.json({ error: "동화 목록을 불러올 수 없습니다." }, { status: 500 });
  }

  return NextResponse.json({
    stories: stories || [],
    total: count || 0,
    page,
    hasMore: (count || 0) > offset + limit,
  });
}
