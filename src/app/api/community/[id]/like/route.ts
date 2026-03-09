import { NextRequest, NextResponse } from "next/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
// FI-5: Static import instead of dynamic import in hot path
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// ─── Guest like rate limiting (per-IP, per-isolate) ───
// HIGH #3 FIX: Tightened from 5/min to 2/5min per IP + daily cap
const GUEST_LIKE_WINDOW = 300_000; // 5 minutes
const GUEST_LIKE_LIMIT = 2; // max 2 guest likes per 5 minutes per IP
const guestLikeMap = new Map<string, { count: number; resetAt: number }>();

// HIGH #3 FIX: Daily cap to limit total guest likes per IP per day (per-isolate)
const GUEST_DAILY_LIMIT = 10; // max 10 guest likes per day per IP
const guestDailyMap = new Map<string, { count: number; resetAt: number }>();

function checkGuestLikeLimit(ip: string): boolean {
  const now = Date.now();
  // Lazy cleanup
  if (guestLikeMap.size > 300) {
    for (const [k, v] of guestLikeMap) {
      if (now > v.resetAt) guestLikeMap.delete(k);
    }
  }
  if (guestDailyMap.size > 300) {
    for (const [k, v] of guestDailyMap) {
      if (now > v.resetAt) guestDailyMap.delete(k);
    }
  }

  // Check daily cap first
  const daily = guestDailyMap.get(ip);
  if (daily && now < daily.resetAt && daily.count >= GUEST_DAILY_LIMIT) return false;

  // Check burst rate
  const entry = guestLikeMap.get(ip);
  if (!entry || now > entry.resetAt) {
    guestLikeMap.set(ip, { count: 1, resetAt: now + GUEST_LIKE_WINDOW });
  } else {
    if (entry.count >= GUEST_LIKE_LIMIT) return false;
    entry.count++;
  }

  // Increment daily counter
  if (!daily || now > daily.resetAt) {
    guestDailyMap.set(ip, { count: 1, resetAt: now + 86_400_000 }); // 24h
  } else {
    daily.count++;
  }

  return true;
}

// CTO-FIX: IP+story deduplication to prevent guest like inflation
// Same IP can only like the same story once per 24h window (per-isolate)
const GUEST_DEDUP_TTL = 86_400_000; // 24 hours
const guestDedupMap = new Map<string, number>(); // key: "ip:storyId" → expiresAt

function isGuestDuplicate(ip: string, storyId: string): boolean {
  const now = Date.now();
  // Lazy cleanup when map grows too large
  if (guestDedupMap.size > 2000) {
    for (const [k, v] of guestDedupMap) {
      if (now > v) guestDedupMap.delete(k);
    }
  }
  const key = `${ip}:${storyId}`;
  const expiresAt = guestDedupMap.get(key);
  if (expiresAt && now < expiresAt) return true; // already liked
  guestDedupMap.set(key, now + GUEST_DEDUP_TTL);
  return false;
}

// POST: Toggle like (authenticated) or guest like (no auth, rate-limited)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  // Validate storyId is a UUID (KR-T2: use shared validator)
  if (!isValidUUID(storyId)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  // Use createApiSupabaseClient to preserve session cookies on auth refresh
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }

  // Guest like — rate-limited + dedup, increment counter only
  if (!user) {
    const ip = getClientIP(request);
    if (!checkGuestLikeLimit(ip)) {
      return sb.applyCookies(NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      ));
    }

    // CTO-FIX: Prevent same IP liking the same story repeatedly
    if (isGuestDuplicate(ip, storyId)) {
      return sb.applyCookies(NextResponse.json({ liked: true, guest: true, duplicate: true }));
    }

    // P1-FIX: Verify story is public before allowing guest likes
    // Without this check, a guest could inflate like_count on private stories
    const { data: publicStory } = await sb.client
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .eq("is_public", true)
      .maybeSingle();
    if (!publicStory) {
      return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
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

  // LAUNCH-FIX: Verify story is public for authenticated likes (parity with guest check)
  const { data: authPublicStory } = await sb.client
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("is_public", true)
    .maybeSingle();
  if (!authPublicStory) {
    return sb.applyCookies(NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 }));
  }

  // Authenticated user — toggle like
  // LAUNCH-FIX: Use maybeSingle() to avoid Supabase error on no-row-found
  const { data: existing } = await sb.client
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .maybeSingle();

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

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    // Guest — like status tracked by client localStorage
    return sb.applyCookies(NextResponse.json({ liked: false, guest: true }));
  }

  // LAUNCH-FIX: Use maybeSingle() to avoid PostgREST error on no-like-found
  const { data } = await sb.client
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .maybeSingle();

  return sb.applyCookies(NextResponse.json({ liked: !!data }));
}
