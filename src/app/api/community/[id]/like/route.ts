import { NextRequest, NextResponse } from "next/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
// FI-5: Static import instead of dynamic import in hot path
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";

export const runtime = "edge";

// ─── Rate limiters (each has its own isolated Map) ───
const guestBurstLimiter = createInMemoryLimiter(RATE_KEYS.LIKE_GUEST_BURST);
const guestDailyLimiter = createInMemoryLimiter(RATE_KEYS.LIKE_GUEST_DAILY);
const dedupLimiter = createInMemoryLimiter(RATE_KEYS.LIKE_DEDUP, { maxEntries: 2000 });
const authLimiter = createInMemoryLimiter(RATE_KEYS.LIKE_AUTH);
const checkLimiter = createInMemoryLimiter(RATE_KEYS.LIKE_CHECK);

// POST: Toggle like (authenticated) or guest like (no auth, rate-limited)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  // Validate storyId is a UUID (KR-T2: use shared validator)
  if (!isValidUUID(storyId)) {
    return NextResponse.json({ error: t("Errors.validation.invalidIdFormat") }, { status: 400 });
  }

  // Use createApiSupabaseClient to preserve session cookies on auth refresh
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
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

  // R2-1: Rate limit authenticated like toggles (15/min per user)
  if (user && !authLimiter.check(user.id, 15, 60_000)) {
    return sb.applyCookies(NextResponse.json(
      { error: t("Errors.rateLimit.tooManyRequests") },
      { status: 429, headers: { "Retry-After": "60" } }
    ));
  }

  // Guest like — rate-limited + dedup, increment counter only
  if (!user) {
    const ip = getClientIP(request);
    // Guest burst rate (2 per 5min) + daily cap (10 per 24h)
    if (!guestBurstLimiter.check(ip, 2, 300_000) || !guestDailyLimiter.check(ip, 10, 86_400_000)) {
      return sb.applyCookies(NextResponse.json(
        { error: t("Errors.rateLimit.tooManyRequests") },
        { status: 429, headers: { "Retry-After": "60" } }
      ));
    }

    // CTO-FIX: Prevent same IP liking the same story repeatedly
    // dedupLimiter.check returns true=allowed (first time), false=duplicate
    if (!dedupLimiter.check(`${ip}:${storyId}`, 1, 86_400_000)) {
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
      return sb.applyCookies(NextResponse.json({ error: t("Errors.story.notFound") }, { status: 404 }));
    }

    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      const { error: rpcError } = await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "like_count",
        p_delta: 1,
      });
      // R2-2: Roll back dedup on RPC failure so user can retry
      if (rpcError) {
        console.error("[Like] Guest increment failed:", rpcError.code);
        dedupLimiter.reset(`${ip}:${storyId}`);
        return sb.applyCookies(NextResponse.json(
          { error: t("Errors.community.likeFailed") },
          { status: 500 }
        ));
      }
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
    return sb.applyCookies(NextResponse.json({ error: t("Errors.story.notFound") }, { status: 404 }));
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

  // R2-FIX: Rate limit like check (30/min per IP)
  const ip = getClientIP(request);
  if (!checkLimiter.check(ip, 30, 60_000)) {
    return NextResponse.json({ liked: false });
  }

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
