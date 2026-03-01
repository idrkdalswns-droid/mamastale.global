import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Guest like rate limiting (per-IP, per-isolate) ───
const GUEST_LIKE_WINDOW = 60_000; // 1 minute
const GUEST_LIKE_LIMIT = 5; // max 5 guest likes per minute per IP
const guestLikeMap = new Map<string, { count: number; resetAt: number }>();

function checkGuestLikeLimit(ip: string): boolean {
  const now = Date.now();
  if (guestLikeMap.size > 300) {
    for (const [k, v] of guestLikeMap) {
      if (now > v.resetAt) guestLikeMap.delete(k);
    }
  }
  const entry = guestLikeMap.get(ip);
  if (!entry || now > entry.resetAt) {
    guestLikeMap.set(ip, { count: 1, resetAt: now + GUEST_LIKE_WINDOW });
    return true;
  }
  if (entry.count >= GUEST_LIKE_LIMIT) return false;
  entry.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });
}

// POST: Toggle like (authenticated) or guest like (no auth, rate-limited)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  // Validate storyId is a UUID
  if (!UUID_RE.test(storyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = getSupabaseClient(request);
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Guest like — rate-limited, increment counter only
  if (!user) {
    const ip = getClientIP(request);
    if (!checkGuestLikeLimit(ip)) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
    }
    return NextResponse.json({ liked: true, guest: true });
  }

  // Authenticated user — toggle like
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  // Use service role for atomic counter updates
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const serviceClient = createServiceRoleClient();

  if (existing) {
    // Unlike
    await supabase.from("likes").delete().eq("id", existing.id);

    // Atomic decrement
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: -1,
      });
    }

    return NextResponse.json({ liked: false });
  } else {
    // Like
    await supabase.from("likes").insert({
      user_id: user.id,
      story_id: storyId,
    });

    // Atomic increment
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
    }

    return NextResponse.json({ liked: true });
  }
}

// GET: Check if current user liked this story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  if (!UUID_RE.test(storyId)) {
    return NextResponse.json({ liked: false });
  }

  const supabase = getSupabaseClient(request);
  if (!supabase) {
    return NextResponse.json({ liked: false });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Guest — like status tracked by client localStorage
    return NextResponse.json({ liked: false, guest: true });
  }

  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  return NextResponse.json({ liked: !!data });
}
