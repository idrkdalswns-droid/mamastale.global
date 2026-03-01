import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

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

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: story, error } = await supabase
    .from("stories")
    .select("id, title, scenes, author_alias, view_count, like_count, comment_count, created_at")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Atomic view count increment — deduplicated per IP per story (5min window)
  const ip = getClientIP(request);
  if (shouldCountView(ip, id)) {
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: id,
        p_column: "view_count",
        p_delta: 1,
      });
    }
  }

  return NextResponse.json({ story });
}
