import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

// R2-FIX: Rate limit community detail GET (prevent enumeration/scraping)
const communityDetailRateMap = new Map<string, { count: number; resetAt: number }>();
function checkCommunityDetailRate(ip: string): boolean {
  const now = Date.now();
  if (communityDetailRateMap.size > 300) {
    for (const [k, v] of communityDetailRateMap) { if (now > v.resetAt) communityDetailRateMap.delete(k); }
  }
  const entry = communityDetailRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    communityDetailRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

// ─── View count deduplication (per-IP per-story, per-isolate) ───
const VIEW_DEDUP_WINDOW = 300_000; // 5 minutes
const viewDedupMap = new Map<string, number>();

function shouldCountView(ip: string, storyId: string): boolean {
  const now = Date.now();
  // Lazy cleanup
  if (viewDedupMap.size > 500) {
    for (const [k, ts] of viewDedupMap) {
      if (now - ts > VIEW_DEDUP_WINDOW) viewDedupMap.delete(k);
    }
  }
  const key = `${ip}:${storyId}`;
  const lastView = viewDedupMap.get(key);
  if (lastView && now - lastView < VIEW_DEDUP_WINDOW) return false;
  viewDedupMap.set(key, now);
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

// GET: Fetch a single public story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // R2-FIX: Rate limit detail GET (30/min per IP)
  const ip = getClientIP(request);
  if (!checkCommunityDetailRate(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: story, error } = await supabase
    .from("stories")
    .select("id, title, scenes, author_alias, cover_image, view_count, like_count, comment_count, created_at")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 });
  }

  // Atomic view count increment — deduplicated per IP per story (5min window)
  if (shouldCountView(ip, id)) {
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      const { error: rpcError } = await serviceClient.rpc("increment_story_counter", {
        p_story_id: id,
        p_column: "view_count",
        p_delta: 1,
      });
      if (rpcError) {
        console.error("[Community] View count increment failed:", rpcError.code);
      }
    }
  }

  return NextResponse.json({ story });
}
