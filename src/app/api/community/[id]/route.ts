import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

// ─── Rate limiters (each has its own isolated Map) ───
const communityDetailLimiter = createInMemoryLimiter(RATE_KEYS.COMMUNITY_DETAIL, { maxEntries: 300 });
// View count deduplication: limit=1, window=5min (same as like dedup pattern)
const viewDedupLimiter = createInMemoryLimiter(RATE_KEYS.COMMUNITY_VIEW_DEDUP, { maxEntries: 500 });

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
  if (!communityDetailLimiter.check(ip, 30, 60_000)) {
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
    .select("id, title, scenes, author_alias, cover_image, view_count, like_count, comment_count, metadata, created_at, story_type, illustration_urls")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 });
  }

  // Atomic view count increment — deduplicated per IP per story (5min window)
  if (!viewDedupLimiter.check(`${ip}:${id}`, 1, 300_000)) {
    // Already counted view within 5min window — skip
  } else {
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

  // Extract source from metadata, don't expose raw metadata to client
  const { metadata, ...storyFields } = story;
  const safeStory = {
    ...storyFields,
    source: storyFields.story_type === "showcase" ? "showcase" : ((metadata as Record<string, unknown> | null)?.source || "ai"),
  };

  return NextResponse.json({ story: safeStory });
}
