import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "결제 시스템이 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  try {
    const { priceType } = await request.json();

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mamastale-global.pages.dev";

    // Use Stripe REST API directly (Edge compatible)
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${appUrl}/?payment=success`);
    params.append("cancel_url", `${appUrl}/pricing?payment=canceled`);
    params.append("locale", "ko");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe API error:", session);
      return NextResponse.json(
        { error: `Stripe 오류: ${session?.error?.message || JSON.stringify(session)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", errMsg);
    return NextResponse.json(
      { error: `결제 오류: ${errMsg}` },
      { status: 500 }
    );
  }
}
