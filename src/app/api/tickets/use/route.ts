import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

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
    // Read current ticket balance + metadata (for premium detection)
    const { data: profile, error: readError } = await sb.client
      .from("profiles")
      .select("free_stories_remaining, metadata")
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

    // New user — no profile row yet → create with 1 free ticket
    if (!profile) {
      const { data: newProfile, error: insertErr } = await sb.client
        .from("profiles")
        .upsert({
          id: user.id,
          free_stories_remaining: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" })
        .select("free_stories_remaining, metadata")
        .single();

      if (insertErr || !newProfile) {
        console.error("[Tickets/Use] Profile create error:", insertErr?.code);
        return sb.applyCookies(NextResponse.json(
          { error: "프로필 생성에 실패했습니다. 다시 시도해 주세요." },
          { status: 500 }
        ));
      }

      // Use the newly created profile
      Object.assign(profile ?? {}, newProfile);
      // Re-assign to use newly created profile in subsequent code
      const remaining = newProfile.free_stories_remaining ?? 0;
      if (remaining <= 0) {
        return sb.applyCookies(NextResponse.json(
          { error: "no_tickets", message: "티켓이 부족합니다." },
          { status: 403 }
        ));
      }

      // Deduct 1 ticket from newly created profile
      const { data: updated, error: deductError } = await sb.client
        .from("profiles")
        .update({
          free_stories_remaining: remaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .eq("free_stories_remaining", remaining)
        .select("free_stories_remaining")
        .single();

      if (deductError || !updated) {
        return sb.applyCookies(NextResponse.json(
          { error: "no_tickets", message: "티켓이 부족합니다." },
          { status: 403 }
        ));
      }

      const metadata = (newProfile.metadata as Record<string, unknown>) || {};
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
    // Previous code used `remaining - 1` which could race if two requests
    // read the same `remaining`. Now we verify the EXACT current value
    // to ensure only one concurrent request can succeed.
    const { data: updated, error: deductError } = await sb.client
      .from("profiles")
      .update({
        free_stories_remaining: remaining - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .eq("free_stories_remaining", remaining) // Exact match — true CAS (Compare-And-Swap)
      .select("free_stories_remaining")
      .single();

    if (deductError || !updated) {
      console.warn("[Tickets/Use] CAS deduction failed:", deductError?.code);
      return sb.applyCookies(NextResponse.json(
        { error: "no_tickets", message: "티켓이 부족합니다." },
        { status: 403 }
      ));
    }

    // Determine premium status from purchase history
    const metadata = (profile.metadata as Record<string, unknown>) || {};
    const processedOrders = (metadata.processed_orders as string[]) || [];
    const isPremium = processedOrders.length > 0;

    return sb.applyCookies(NextResponse.json({
      success: true,
      remaining: updated.free_stories_remaining,
      isPremium,
    }));
  } catch (error) {
    console.error("[Tickets/Use] Error:", error instanceof Error ? error.message : "Unknown");
    return sb.applyCookies(NextResponse.json(
      { error: "티켓 사용 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  }
}
