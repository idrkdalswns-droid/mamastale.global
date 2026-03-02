import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { incrementTickets } from "@/lib/supabase/tickets";

export const runtime = "edge";

// ─── Valid prices (server-side source of truth) ───
const VALID_PRICES: Record<number, number> = {
  4900: 1,   // ₩4,900 = 1 ticket
  18900: 5,  // ₩18,900 = 5 tickets
};

// ─── Order ID deduplication (per-isolate, in-memory) ───
const processedOrders = new Map<string, number>();
const ORDER_DEDUP_TTL_MS = 600_000; // 10 minutes

function isOrderProcessed(orderId: string): boolean {
  const now = Date.now();
  // Lazy cleanup
  if (processedOrders.size > 500) {
    for (const [id, ts] of processedOrders) {
      if (now - ts > ORDER_DEDUP_TTL_MS) processedOrders.delete(id);
    }
  }
  if (processedOrders.has(orderId)) return true;
  processedOrders.set(orderId, now);
  return false;
}

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

    // ─── Server-side idempotency guard ───
    if (isOrderProcessed(orderId)) {
      const ticketCount = VALID_PRICES[Number(amount)] || 1;
      return sb.applyCookies(NextResponse.json({
        success: true,
        ticketsAdded: ticketCount,
        alreadyProcessed: true,
      }));
    }

    // ─── Server-side price validation ───
    const numericAmount = Number(amount);
    if (!VALID_PRICES[numericAmount]) {
      return NextResponse.json(
        { error: "유효하지 않은 결제 금액입니다." },
        { status: 400 }
      );
    }

    // Confirm payment with Toss Payments API (10s timeout)
    const encryptedKey = btoa(`${tossSecretKey}:`);
    const tossAbort = new AbortController();
    const tossTimeout = setTimeout(() => tossAbort.abort(), 10_000);

    let confirmRes: Response;
    try {
      confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${encryptedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount: numericAmount }),
        signal: tossAbort.signal,
      });
    } catch (fetchErr) {
      clearTimeout(tossTimeout);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        console.error("[Toss] Payment confirmation timed out for order:", orderId);
        return NextResponse.json(
          { error: "결제 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
    clearTimeout(tossTimeout);

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
        { error: "결제 확인에 실패했습니다." },
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

    // IL-03: DB-level idempotency — store orderId before incrementing tickets
    // Uses profiles.metadata to track processed orders (no extra table needed)
    const { data: profile } = await sb.client
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    const metadata = (profile?.metadata as Record<string, unknown>) || {};
    const processedOrderIds = (metadata.processed_orders as string[]) || [];
    if (processedOrderIds.includes(orderId)) {
      return sb.applyCookies(NextResponse.json({
        success: true, ticketsAdded: ticketCount, alreadyProcessed: true,
      }));
    }

    // ─── Atomic ticket increment ───
    const newTotal = await incrementTickets(sb.client, user.id, ticketCount);

    // Record orderId in profile metadata to prevent cross-isolate double processing
    const updatedOrders = [...processedOrderIds.slice(-19), orderId]; // Keep last 20
    await sb.client
      .from("profiles")
      .update({ metadata: { ...metadata, processed_orders: updatedOrders } })
      .eq("id", user.id);

    // KR-04: Mask user ID in logs to prevent PII leakage
    const maskedUserId = user.id.slice(0, 8) + "…";
    console.log(
      `[Toss] Payment confirmed: ${confirmData.orderId}, ` +
      `user=${maskedUserId}, tickets +${ticketCount}, total=${newTotal}`
    );

    return sb.applyCookies(NextResponse.json({
      success: true,
      ticketsAdded: ticketCount,
      ticketsTotal: newTotal,
    }));
  } catch (error) {
    console.error("[Toss] Confirm error:", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json(
      { error: "결제 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
