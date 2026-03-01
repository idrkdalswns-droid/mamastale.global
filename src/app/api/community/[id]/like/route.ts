import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
// FI-5: Static import instead of dynamic import in hot path
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

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

  // Validate storyId is a UUID (KR-T2: use shared validator)
  if (!isValidUUID(storyId)) {
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
  const serviceClient = createServiceRoleClient();

  if (existing) {
    // Unlike
    const { error: deleteError } = await supabase.from("likes").delete().eq("id", existing.id);

    // IN-4: Only decrement counter if delete succeeded (prevents count drift)
    if (!deleteError && serviceClient) {
      const { error: rpcError } = await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: -1,
      });
      if (rpcError) console.error("[Like] Decrement failed:", rpcError.message);
    }

    return NextResponse.json({ liked: false });
  } else {
    // Like
    const { error: insertError } = await supabase.from("likes").insert({
      user_id: user.id,
      story_id: storyId,
    });

    // IN-4: Only increment counter if insert succeeded (prevents count drift on duplicate)
    if (!insertError && serviceClient) {
      const { error: rpcError } = await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
      if (rpcError) console.error("[Like] Increment failed:", rpcError.message);
    }

    return NextResponse.json({ liked: !insertError });
  }
}

// GET: Check if current user liked this story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  if (!isValidUUID(storyId)) {
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
