import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { incrementTickets } from "@/lib/supabase/tickets";
import { z } from "zod";

export const runtime = "edge";

// ─── Valid prices (server-side source of truth) ───
const VALID_PRICES: Record<number, number> = {
  4900: 1,   // ₩4,900 = 1 ticket
  18900: 5,  // ₩18,900 = 5 tickets
};

// ─── Zod schema for payment confirmation request ───
// mode: "widget" uses TOSS_WIDGET_SECRET_KEY (gsk_), "standard" uses TOSS_SECRET_KEY (sk_)
// Official Toss sample uses separate endpoints; we use a single endpoint with mode param
const confirmRequestSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().min(1).max(64).regex(/^order_[a-f0-9-]+$/i, "Invalid order ID format"),
  amount: z.number().int().positive().max(1_000_000),
  mode: z.enum(["widget", "standard"]).default("widget"),
});

// ─── Request body size limit ───
const MAX_BODY_SIZE = 4_000; // 4KB — confirm requests are tiny

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
  // Validate that at least one secret key is configured
  const widgetSecretKey = process.env.TOSS_WIDGET_SECRET_KEY;
  const apiSecretKey = process.env.TOSS_SECRET_KEY;
  if (!widgetSecretKey && !apiSecretKey) {
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
    // CRITICAL: Apply cookies even on auth failure to preserve session refresh
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  try {
    // ─── Body size limit (DoS prevention) ───
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return sb.applyCookies(NextResponse.json(
        { error: "요청 데이터가 너무 큽니다." },
        { status: 413 }
      ));
    }

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

    // ─── Zod validation ───
    const parsed = confirmRequestSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json(
        { error: "유효하지 않은 결제 데이터입니다." },
        { status: 400 }
      ));
    }

    const { paymentKey, orderId, amount, mode } = parsed.data;

    // ─── Select secret key based on payment mode ───
    // Widget mode (gck_ client key) → must use gsk_ secret key
    // Standard mode (ck_ client key) → must use sk_ secret key
    // Mismatched key pairs cause FORBIDDEN_REQUEST in production
    const tossSecretKey = mode === "standard"
      ? (apiSecretKey || widgetSecretKey)!   // Standard prefers sk_, falls back to gsk_
      : (widgetSecretKey || apiSecretKey)!;  // Widget prefers gsk_, falls back to sk_

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
      return sb.applyCookies(NextResponse.json(
        { error: "유효하지 않은 결제 금액입니다." },
        { status: 400 }
      ));
    }

    // Confirm payment with Toss Payments API (10s timeout)
    // Base64-encode for HTTP Basic Auth (actual transport encryption is via HTTPS)
    const basicAuthCredential = btoa(`${tossSecretKey}:`);
    const tossAbort = new AbortController();
    const tossTimeout = setTimeout(() => tossAbort.abort(), 10_000);

    let confirmRes: Response;
    try {
      confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuthCredential}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount: numericAmount }),
        signal: tossAbort.signal,
      });
    } catch (fetchErr) {
      clearTimeout(tossTimeout);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        console.error("[Toss] Payment confirmation timed out for order:", orderId);
        return sb.applyCookies(NextResponse.json(
          { error: "결제 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." },
          { status: 504 }
        ));
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
        return sb.applyCookies(NextResponse.json({
          success: true,
          ticketsAdded: ticketCount,
          alreadyProcessed: true,
        }));
      }

      console.error("[Toss] Payment confirmation failed:", confirmData?.code, confirmData?.message);
      // Forward Toss error code to client for specific error messages on fail page
      return sb.applyCookies(NextResponse.json(
        {
          error: confirmData?.message || "결제 확인에 실패했습니다.",
          code: confirmData?.code || "UNKNOWN_ERROR",
        },
        { status: 400 }
      ));
    }

    // ─── Use Toss-confirmed amount (not client-supplied) ───
    const confirmedAmount = confirmData.totalAmount;
    const ticketCount = VALID_PRICES[confirmedAmount];

    if (!ticketCount) {
      console.error("[Toss] Unexpected confirmed amount:", confirmedAmount);
      return sb.applyCookies(NextResponse.json(
        { error: "결제 금액이 유효하지 않습니다." },
        { status: 400 }
      ));
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
    // Log payment method for analytics (카드/카카오페이/네이버페이/토스페이 etc.)
    // Prefer easyPay.provider for specific provider name (e.g., "카카오페이" instead of "간편결제")
    const paymentMethod = confirmData.easyPay?.provider || confirmData.method || "unknown";
    console.log(
      `[Toss] Payment confirmed: ${confirmData.orderId}, ` +
      `method=${paymentMethod}, user=${maskedUserId}, tickets +${ticketCount}, total=${newTotal}`
    );

    return sb.applyCookies(NextResponse.json({
      success: true,
      ticketsAdded: ticketCount,
      ticketsTotal: newTotal,
      paymentMethod: typeof paymentMethod === "string" ? paymentMethod : "unknown",
    }));
  } catch (error) {
    console.error("[Toss] Confirm error:", error instanceof Error ? error.name : "Unknown");
    return sb.applyCookies(NextResponse.json(
      { error: "결제 확인 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  }
}
