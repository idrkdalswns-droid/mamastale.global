import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "결제 시스템이 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  // ─── Require authentication ───
  let userId: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    const { priceType } = body;

    // KR-S1: Validate priceType against allowlist
    if (priceType !== "ticket" && priceType !== "bundle") {
      return NextResponse.json(
        { error: "잘못된 상품 유형입니다." },
        { status: 400 }
      );
    }

    const priceId =
      priceType === "bundle"
        ? process.env.STRIPE_BUNDLE_PRICE_ID
        : process.env.STRIPE_TICKET_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "상품 정보가 설정되지 않았습니다." },
        { status: 400 }
      );
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

    // UK-6: Idempotency-Key prevents duplicate sessions on network retry
    const idempotencyKey = `checkout_${userId}_${Date.now()}`;

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
      return NextResponse.json(
        { error: `결제 오류가 발생했습니다. 다시 시도해 주세요.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", errMsg);
    return NextResponse.json(
      { error: "결제 오류가 발생했습니다. 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
