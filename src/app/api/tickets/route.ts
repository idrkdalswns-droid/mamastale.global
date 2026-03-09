import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

// R2-FIX: Rate limiting for ticket balance check (prevent API abuse from Pricing page)
const TICKET_CHECK_RATE_WINDOW = 60_000; // 1 minute
const TICKET_CHECK_RATE_LIMIT = 15; // max 15 checks per minute per IP
const ticketCheckRateMap = new Map<string, { count: number; resetAt: number }>();

function checkTicketCheckRate(key: string): boolean {
  const now = Date.now();
  if (ticketCheckRateMap.size > 300) {
    for (const [k, v] of ticketCheckRateMap) {
      if (now > v.resetAt) ticketCheckRateMap.delete(k);
    }
  }
  const entry = ticketCheckRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    ticketCheckRateMap.set(key, { count: 1, resetAt: now + TICKET_CHECK_RATE_WINDOW });
    return true;
  }
  if (entry.count >= TICKET_CHECK_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// GET: Check remaining tickets + first purchase eligibility
export async function GET(request: NextRequest) {
  // R2-FIX: Rate limit ticket balance checks
  const ip = getClientIP(request);
  if (!checkTicketCheckRate(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // CTO-FIX: Try cookie auth first, then Bearer token fallback
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: tokenData } = await sb.client.auth.getUser(token);
      user = tokenData.user;
    }
  }
  if (!user) {
    // CTO-FIX: applyCookies was missing on 401 response
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  const { data: profile, error } = await sb.client
    .from("profiles")
    .select("free_stories_remaining")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Tickets] DB error: code=", error.code);
    return sb.applyCookies(NextResponse.json({ error: "티켓 정보를 불러올 수 없습니다." }, { status: 500 }));
  }

  let remaining = 0;

  // New user — no profile row yet → auto-create with 1 free ticket
  if (!profile) {
    // LAUNCH-FIX: Use ignoreDuplicates to prevent overwriting existing profile
    // (race between GET /api/tickets and POST /api/tickets/use could reset remaining to 1)
    const { error: upsertErr } = await sb.client
      .from("profiles")
      .upsert({
        id: user.id,
        free_stories_remaining: 1,
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

    remaining = actualProfile?.free_stories_remaining ?? 1;
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

  return sb.applyCookies(NextResponse.json({ remaining, isFirstPurchase }));
}
