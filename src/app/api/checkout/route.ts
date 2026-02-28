import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "edge";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "결제 시스템이 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  try {
    const { priceType } = await request.json();

    // Map price type to Stripe Price ID
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/?payment=success`,
      cancel_url: `${appUrl}/pricing?payment=canceled`,
      locale: "ko",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "결제 세션 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
