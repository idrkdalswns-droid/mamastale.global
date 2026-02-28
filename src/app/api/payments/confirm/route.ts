import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { incrementTickets } from "@/lib/supabase/tickets";

export const runtime = "edge";

// ─── Valid prices (server-side source of truth) ───
const VALID_PRICES: Record<number, number> = {
  2000: 1,  // ₩2,000 = 1 ticket
  8000: 5,  // ₩8,000 = 5 tickets
};

export async function POST(request: NextRequest) {
  const tossSecretKey = process.env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    return NextResponse.json(
      { error: "결제 시스템이 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  // Authenticate user
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
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

    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    // ─── Server-side price validation ───
    const numericAmount = Number(amount);
    if (!VALID_PRICES[numericAmount]) {
      return NextResponse.json(
        { error: "유효하지 않은 결제 금액입니다." },
        { status: 400 }
      );
    }

    // Confirm payment with Toss Payments API
    const encryptedKey = btoa(`${tossSecretKey}:`);
    const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encryptedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: numericAmount }),
    });

    const confirmData = await confirmRes.json();

    if (!confirmRes.ok) {
      // Handle already-confirmed payments gracefully (e.g., user refreshed success page)
      // Toss returns ALREADY_PROCESSED_PAYMENT when payment was already confirmed.
      // Return success WITHOUT incrementing tickets again to prevent double-charge.
      if (confirmData?.code === "ALREADY_PROCESSED_PAYMENT") {
        const ticketCount = VALID_PRICES[numericAmount] || 1;
        return NextResponse.json({
          success: true,
          ticketsAdded: ticketCount,
          alreadyProcessed: true,
        });
      }

      console.error("[Toss] Payment confirmation failed:", confirmData?.code);
      return NextResponse.json(
        { error: confirmData.message || "결제 확인에 실패했습니다." },
        { status: 400 }
      );
    }

    // ─── Use Toss-confirmed amount (not client-supplied) ───
    const confirmedAmount = confirmData.totalAmount;
    const ticketCount = VALID_PRICES[confirmedAmount];

    if (!ticketCount) {
      console.error("[Toss] Unexpected confirmed amount:", confirmedAmount);
      return NextResponse.json(
        { error: "결제 금액이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    // ─── Atomic ticket increment ───
    const newTotal = await incrementTickets(sb.client, user.id, ticketCount);

    console.log(
      `[Toss] Payment confirmed: ${confirmData.orderId}, ` +
      `user=${user.id}, tickets +${ticketCount}, total=${newTotal}`
    );

    return sb.applyCookies(NextResponse.json({
      success: true,
      ticketsAdded: ticketCount,
      ticketsTotal: newTotal,
    }));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[Toss] Confirm error:", errMsg);
    return NextResponse.json(
      { error: "결제 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
