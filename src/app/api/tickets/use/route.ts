import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

// ─── Rate limiter ───
const ticketUseLimiter = createInMemoryLimiter(RATE_KEYS.TICKET_USE, { maxEntries: 300 });

/**
 * POST /api/tickets/use
 *
 * Deducts 1 ticket at chat start. Called when user confirms
 * "티켓 한 장을 사용하시겠습니까?" before beginning a new story.
 *
 * Uses atomic conditional update (gte check) to prevent race conditions.
 * Returns updated remaining count + premium status.
 */
export async function POST(request: NextRequest) {
  // P0-FIX: Rate limit ticket use to prevent abuse
  const ip = getClientIP(request);
  if (!ticketUseLimiter.check(ip, 5, 60_000)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // P2-FIX(DE-3): Consistent auth with Bearer token fallback (same as /api/stories)
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: tokenData } = await sb.client.auth.getUser(token);
      if (tokenData.user) {
        console.warn("[Tickets/Use] Auth resolved via Bearer token fallback");
        user = tokenData.user;
      }
    }
  }
  if (!user) {
    // CRITICAL: Apply cookies even on auth failure — Supabase may have started
    // a session refresh during getUser(), and dropping those cookies breaks
    // the client's session permanently.
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  try {
    // ROOT-CAUSE FIX: Query ONLY free_stories_remaining first.
    // The previous code selected "free_stories_remaining, metadata" in a single query.
    // If the "metadata" column doesn't exist in profiles, PostgREST returns a column-not-found
    // error (code !== PGRST116), which triggered the "프로필 정보를 불러올 수 없습니다." error.
    const { data: profile, error: readError } = await sb.client
      .from("profiles")
      .select("free_stories_remaining")
      .eq("id", user.id)
      .single();

    if (readError && readError.code !== "PGRST116") {
      // Real DB error (not "no rows found")
      console.error("[Tickets/Use] Profile read error:", readError.code, readError.message);
      return sb.applyCookies(NextResponse.json(
        { error: "프로필 정보를 불러올 수 없습니다." },
        { status: 500 }
      ));
    }

    // Helper: Try to read metadata column separately (graceful fallback)
    // If column doesn't exist, returns empty object instead of crashing
    const readMetadata = async (userId: string): Promise<Record<string, unknown>> => {
      try {
        const { data: metaRow, error: metaErr } = await sb.client
          .from("profiles")
          .select("metadata")
          .eq("id", userId)
          .single();
        if (metaErr || !metaRow) return {};
        return (metaRow.metadata as Record<string, unknown>) || {};
      } catch {
        return {};
      }
    };

    // New user — no profile row yet → create with 0 free tickets
    // (first story is free without ticket — freemium model v2)
    if (!profile) {
      // LAUNCH-FIX: Use ignoreDuplicates to prevent overwriting existing profile
      const { error: insertErr } = await sb.client
        .from("profiles")
        .upsert({
          id: user.id,
          free_stories_remaining: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });

      if (insertErr) {
        console.error("[Tickets/Use] Profile create error:", insertErr.code);
        return sb.applyCookies(NextResponse.json(
          { error: "프로필 생성에 실패했습니다. 다시 시도해 주세요." },
          { status: 500 }
        ));
      }

      // Re-read actual profile (another concurrent request may have created it first)
      const { data: actualProfile } = await sb.client
        .from("profiles")
        .select("free_stories_remaining")
        .eq("id", user.id)
        .single();

      const actualRemaining = actualProfile?.free_stories_remaining ?? 0;
      if (actualRemaining <= 0) {
        return sb.applyCookies(NextResponse.json(
          { error: "no_tickets", message: "티켓이 부족합니다." },
          { status: 403 }
        ));
      }

      // Deduct 1 ticket from actual remaining (CAS guard)
      const { data: updated, error: deductError } = await sb.client
        .from("profiles")
        .update({
          free_stories_remaining: actualRemaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .eq("free_stories_remaining", actualRemaining)
        .select("free_stories_remaining")
        .single();

      if (deductError || !updated) {
        // R8-FIX(B2): CAS failure for new user = concurrent conflict, not genuinely out of tickets
        return sb.applyCookies(NextResponse.json(
          { error: "concurrent_conflict", message: "일시적인 충돌이 발생했습니다. 다시 시도해 주세요." },
          { status: 409 }
        ));
      }

      const metadata = await readMetadata(user.id);
      const processedOrders = (metadata.processed_orders as string[]) || [];
      const isPremium = processedOrders.length > 0;

      return sb.applyCookies(NextResponse.json({
        success: true,
        remaining: updated.free_stories_remaining,
        isPremium,
      }));
    }

    const remaining = profile.free_stories_remaining ?? 0;
    if (remaining <= 0) {
      return sb.applyCookies(NextResponse.json(
        { error: "no_tickets", message: "티켓이 부족합니다." },
        { status: 403 }
      ));
    }

    // P0-FIX(US-4): Truly atomic deduction using exact expected value.
    // Verifies the EXACT current value to ensure only one concurrent request can succeed.
    // LAUNCH-FIX: Auto-retry on CAS miss (concurrent write ≠ no tickets)
    let updated: { free_stories_remaining: number } | null = null;
    for (let casAttempt = 0; casAttempt < 3; casAttempt++) {
      const currentRemaining = casAttempt === 0 ? remaining : (
        await sb.client.from("profiles").select("free_stories_remaining").eq("id", user.id).single()
      ).data?.free_stories_remaining ?? 0;

      if (currentRemaining <= 0) {
        return sb.applyCookies(NextResponse.json(
          { error: "no_tickets", message: "티켓이 부족합니다." },
          { status: 403 }
        ));
      }

      const { data: casResult, error: deductError } = await sb.client
        .from("profiles")
        .update({
          free_stories_remaining: currentRemaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .eq("free_stories_remaining", currentRemaining) // CAS (Compare-And-Swap)
        .select("free_stories_remaining")
        .single();

      if (!deductError && casResult) {
        updated = casResult;
        break;
      }
      if (casAttempt === 0) {
        console.warn("[Tickets/Use] CAS miss (concurrent write), retrying...");
      }
    }

    if (!updated) {
      // R2-FIX(B1): Changed error code from "no_tickets" to "concurrent_conflict"
      // so the client can distinguish "out of tickets" (403) from "retry needed" (409).
      // Previously, both cases returned "no_tickets", causing the client to show
      // a "buy tickets" prompt when the user actually had tickets (just a write conflict).
      console.warn("[Tickets/Use] CAS deduction failed after retry");
      return sb.applyCookies(NextResponse.json(
        { error: "concurrent_conflict", message: "일시적인 충돌이 발생했습니다. 다시 시도해 주세요." },
        { status: 409 }
      ));
    }

    // Determine premium status from purchase history (graceful fallback)
    const metadata = await readMetadata(user.id);
    const processedOrders = (metadata.processed_orders as string[]) || [];
    const isPremium = processedOrders.length > 0;

    return sb.applyCookies(NextResponse.json({
      success: true,
      remaining: updated.free_stories_remaining,
      isPremium,
    }));
  } catch (error) {
    // R4-FIX: Log error.name instead of error.message to avoid PII leakage
    console.error("[Tickets/Use] Error:", error instanceof Error ? error.name : "Unknown");
    return sb.applyCookies(NextResponse.json(
      { error: "티켓 사용 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  }
}
