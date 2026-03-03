import { NextRequest, NextResponse } from "next/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
// FI-5: Static import instead of dynamic import in hot path
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

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

  // Use createApiSupabaseClient to preserve session cookies on auth refresh
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();

  // Guest like — rate-limited, increment counter only
  if (!user) {
    const ip = getClientIP(request);
    if (!checkGuestLikeLimit(ip)) {
      return sb.applyCookies(NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      ));
    }

    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
    }
    return sb.applyCookies(NextResponse.json({ liked: true, guest: true }));
  }

  // Authenticated user — toggle like
  const { data: existing } = await sb.client
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  // Use service role for atomic counter updates
  const serviceClient = createServiceRoleClient();

  if (existing) {
    // Unlike
    const { error: deleteError } = await sb.client.from("likes").delete().eq("id", existing.id);

    // IN-4: Only decrement counter if delete succeeded (prevents count drift)
    if (!deleteError && serviceClient) {
      const { error: rpcError } = await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: -1,
      });
      if (rpcError) console.error("[Like] Decrement failed:", rpcError.message);
    }

    return sb.applyCookies(NextResponse.json({ liked: false }));
  } else {
    // Like
    const { error: insertError } = await sb.client.from("likes").insert({
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

    return sb.applyCookies(NextResponse.json({ liked: !insertError }));
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

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ liked: false });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    // Guest — like status tracked by client localStorage
    return sb.applyCookies(NextResponse.json({ liked: false, guest: true }));
  }

  const { data } = await sb.client
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();

  return sb.applyCookies(NextResponse.json({ liked: !!data }));
}
