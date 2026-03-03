import { NextRequest, NextResponse } from "next/server";
import { getClientIP } from "@/lib/utils/validation";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// ─── Rate limiting for checkout (prevent Stripe session spam) ───
const CHECKOUT_RATE_WINDOW = 60_000; // 1 minute
const CHECKOUT_RATE_LIMIT = 5; // max 5 checkout attempts per minute per IP
const checkoutRateMap = new Map<string, { count: number; resetAt: number }>();

function checkCheckoutRate(key: string): boolean {
  const now = Date.now();
  if (checkoutRateMap.size > 300) {
    for (const [k, v] of checkoutRateMap) {
      if (now > v.resetAt) checkoutRateMap.delete(k);
    }
  }
  const entry = checkoutRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    checkoutRateMap.set(key, { count: 1, resetAt: now + CHECKOUT_RATE_WINDOW });
    return true;
  }
  if (entry.count >= CHECKOUT_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate limit by IP before any processing
  const ip = getClientIP(request);
  if (!checkCheckoutRate(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "결제 시스템이 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  // ─── Require authentication (with session cookie preservation) ───
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return sb.applyCookies(NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    ));
  }

  const userId = user.id;

  try {
    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      ));
    }

    const { priceType } = body;

    // KR-S1: Validate priceType against allowlist
    if (priceType !== "ticket" && priceType !== "bundle") {
      return sb.applyCookies(NextResponse.json(
        { error: "잘못된 상품 유형입니다." },
        { status: 400 }
      ));
    }

    const priceId =
      priceType === "bundle"
        ? process.env.STRIPE_BUNDLE_PRICE_ID
        : process.env.STRIPE_TICKET_PRICE_ID;

    if (!priceId) {
      return sb.applyCookies(NextResponse.json(
        { error: "상품 정보가 설정되지 않았습니다." },
        { status: 400 }
      ));
    }

    const ticketCount = priceType === "bundle" ? 5 : 1;

    // Use request origin for reliable URL (works on all environments)
    const appUrl = new URL(request.url).origin;

    // Use Stripe REST API directly (Edge compatible)
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${appUrl}/?payment=success`);
    params.append("cancel_url", `${appUrl}/pricing?payment=canceled`);
    params.append("locale", "ko");
    // Always pass user info (userId is guaranteed non-null here)
    params.append("metadata[user_id]", userId);
    params.append("metadata[ticket_count]", String(ticketCount));

    // IL-04: Stable idempotency key per user+product+minute (prevents duplicate sessions)
    const idempotencyKey = `checkout_${userId}_${priceType}_${Math.floor(Date.now() / 60000)}`;

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe API error:", session?.error?.type);
      return sb.applyCookies(NextResponse.json(
        { error: "결제 오류가 발생했습니다. 다시 시도해 주세요." },
        { status: 500 }
      ));
    }

    return sb.applyCookies(NextResponse.json({ url: session.url }));
  } catch (error: unknown) {
    console.error("Checkout error:", error instanceof Error ? error.name : "Unknown");
    return sb.applyCookies(NextResponse.json(
      { error: "결제 오류가 발생했습니다. 다시 시도해 주세요." },
      { status: 500 }
    ));
  }
}
