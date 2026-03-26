import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";

export const runtime = "edge";

// ─── Rate limiter ───
const ticketCheckLimiter = createInMemoryLimiter(RATE_KEYS.TICKET_CHECK, { maxEntries: 300 });

// GET: Check remaining tickets + first purchase eligibility
export async function GET(request: NextRequest) {
  // R2-FIX: Rate limit ticket balance checks
  const ip = getClientIP(request);
  if (!ticketCheckLimiter.check(ip, 15, 60_000)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Tickets");
  if (!user) {
    // CTO-FIX: applyCookies was missing on 401 response
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  const { data: profile, error } = await sb.client
    .from("profiles")
    .select("free_stories_remaining, worksheet_tickets_remaining")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Tickets] DB error: code=", error.code);
    return sb.applyCookies(NextResponse.json({ error: "티켓 정보를 불러올 수 없습니다." }, { status: 500 }));
  }

  let remaining = 0;

  // New user — no profile row yet → auto-create with 0 free tickets
  // (first story is free without ticket — freemium model v2)
  if (!profile) {
    // LAUNCH-FIX: Use ignoreDuplicates to prevent overwriting existing profile
    const { error: upsertErr } = await sb.client
      .from("profiles")
      .upsert({
        id: user.id,
        free_stories_remaining: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id", ignoreDuplicates: true });

    if (upsertErr) {
      console.error("[Tickets] Profile create error:", upsertErr.code);
      return sb.applyCookies(NextResponse.json({ error: "티켓 정보를 불러올 수 없습니다." }, { status: 500 }));
    }

    // Re-read actual value (insert may have been a no-op if profile already existed)
    const { data: actualProfile } = await sb.client
      .from("profiles")
      .select("free_stories_remaining")
      .eq("id", user.id)
      .single();

    remaining = actualProfile?.free_stories_remaining ?? 0;
  } else {
    remaining = profile.free_stories_remaining ?? 0;
  }

  // Check first purchase eligibility: no prior processed orders in metadata
  // LAUNCH-FIX: Renamed inner variable to avoid shadowing outer `profile`
  let isFirstPurchase = false;
  try {
    const { data: metaProfile } = await sb.client
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();
    const meta = (metaProfile?.metadata as Record<string, unknown>) || {};
    const priorOrders = (meta.processed_orders as string[]) || [];
    isFirstPurchase = priorOrders.length === 0;
  } catch {
    isFirstPurchase = false;
  }

  // Freemium v2: Count completed stories to determine first-story eligibility
  let storyCount = 0;
  try {
    const { count, error: countErr } = await sb.client
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");
    if (!countErr && count !== null) {
      storyCount = count;
    }
    // fallback: 0 (treat as first story — giving one extra free is safer than forcing payment)
  } catch {
    storyCount = 0;
  }

  // 활동지 티켓 잔여량
  const worksheetTickets = profile?.worksheet_tickets_remaining ?? 0;

  return sb.applyCookies(NextResponse.json({ remaining, isFirstPurchase, storyCount, worksheet_tickets_remaining: worksheetTickets }));
}
