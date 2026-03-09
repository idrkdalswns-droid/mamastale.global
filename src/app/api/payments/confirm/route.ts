import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { incrementTickets } from "@/lib/supabase/tickets";
import { z } from "zod";
import { getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

// LAUNCH-FIX: Rate limiting for payment confirmations (prevent abuse)
const PAYMENT_RATE_WINDOW = 60_000; // 1 minute
const PAYMENT_RATE_LIMIT = 10; // 10 confirm attempts per minute per IP
const paymentRateMap = new Map<string, { count: number; resetAt: number }>();

function checkPaymentRate(ip: string): boolean {
  const now = Date.now();
  if (paymentRateMap.size > 300) {
    for (const [k, v] of paymentRateMap) { if (now > v.resetAt) paymentRateMap.delete(k); }
  }
  const entry = paymentRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    paymentRateMap.set(ip, { count: 1, resetAt: now + PAYMENT_RATE_WINDOW });
    return true;
  }
  if (entry.count >= PAYMENT_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Valid prices (server-side source of truth) ───
const VALID_PRICES: Record<number, number> = {
  3920: 1,   // ₩3,920 = 1 ticket (첫 구매 20% 할인)
  4900: 1,   // ₩4,900 = 1 ticket
  14900: 4,  // ₩14,900 = 4 tickets (4일 프로그램)
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
  if (processedOrders.size > 200) {
    for (const [key, timestamp] of processedOrders) {
      if (now - timestamp > ORDER_DEDUP_TTL_MS) processedOrders.delete(key);
    }
  }
  return processedOrders.has(orderId);
}

function markOrderProcessed(orderId: string): void {
  processedOrders.set(orderId, Date.now());
}

export async function POST(request: NextRequest) {
  // LAUNCH-FIX: Rate limit payment confirmations
  const ip = getClientIP(request);
  if (!checkPaymentRate(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

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

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
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

    // ─── Select secret key based on payment mode (NO cross-mode fallback) ───
    // Widget mode (gck_ client key) → MUST use gsk_ secret key
    // Standard mode (ck_ client key) → MUST use sk_ secret key
    // Mismatched key pairs cause FORBIDDEN_REQUEST from Toss
    const tossSecretKey = mode === "standard" ? apiSecretKey : widgetSecretKey;
    if (!tossSecretKey) {
      console.error(`[Toss] Missing secret key for mode="${mode}"`);
      return sb.applyCookies(NextResponse.json(
        { error: "결제 시스템 설정 오류입니다.", code: "MISSING_SECRET_KEY" },
        { status: 503 }
      ));
    }

    // ─── Server-side idempotency guard ───
    if (isOrderProcessed(orderId)) {
      return sb.applyCookies(NextResponse.json({
        success: true,
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

    // ─── First-purchase discount validation ───
    // ₩3,920 is only valid for users with no prior purchase history
    if (numericAmount === 3920) {
      try {
        const { data: profile } = await sb.client
          .from("profiles")
          .select("metadata")
          .eq("id", user.id)
          .single();
        const meta = (profile?.metadata as Record<string, unknown>) || {};
        const priorOrders = (meta.processed_orders as string[]) || [];
        if (priorOrders.length > 0) {
          return sb.applyCookies(NextResponse.json(
            { error: "첫 구매 할인은 한 번만 사용 가능합니다." },
            { status: 400 }
          ));
        }
      } catch {
        // If metadata check fails, DENY the discount (safe default)
        return sb.applyCookies(NextResponse.json(
          { error: "첫 구매 할인 자격을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." },
          { status: 400 }
        ));
      }
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

    // P0-FIX: Wrap Toss response parsing in try-catch (Toss may return HTML on 502/503)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let confirmData: any;
    try {
      confirmData = await confirmRes.json();
    } catch {
      console.error("[Toss] Non-JSON response from Toss API, status:", confirmRes.status);
      return sb.applyCookies(NextResponse.json(
        { error: "결제 서버 응답 오류입니다. 잠시 후 다시 시도해 주세요.", code: "PROVIDER_ERROR" },
        { status: 502 }
      ));
    }

    if (!confirmRes.ok) {
      // Handle already-confirmed payments gracefully (e.g., user refreshed success page)
      // Toss returns ALREADY_PROCESSED_PAYMENT when payment was already confirmed.
      // Return success WITHOUT incrementing tickets again to prevent double-charge.
      if (confirmData?.code === "ALREADY_PROCESSED_PAYMENT") {
        markOrderProcessed(orderId);
        return sb.applyCookies(NextResponse.json({
          success: true,
          alreadyProcessed: true,
        }));
      }

      console.error("[Toss] Payment confirmation failed:", confirmData?.code, confirmData?.message);
      // CTO-FIX: Use generic error message instead of forwarding Toss internal error details
      // Only forward the error code (safe), not the message (may contain internal info)
      // R4-FIX: Never forward provider error codes to client (information disclosure)
      return sb.applyCookies(NextResponse.json(
        { error: "결제 확인에 실패했습니다." },
        { status: 400 }
      ));
    }

    // ─── Use Toss-confirmed amount (not client-supplied) ───
    const confirmedAmount = confirmData.totalAmount;

    // LAUNCH-FIX: Verify Toss-confirmed amount matches client request (detect tampering/mismatch)
    // R4-FIX: Block transaction if client-declared amount doesn't match Toss-confirmed amount
    if (confirmedAmount !== numericAmount) {
      console.error(`[SECURITY] Amount tampering attempt: client=${numericAmount}, toss=${confirmedAmount}, order=${orderId}`);
      return sb.applyCookies(NextResponse.json(
        { error: "결제 금액 검증에 실패했습니다. 다시 시도해 주세요." },
        { status: 400 }
      ));
    }

    const ticketCount = VALID_PRICES[confirmedAmount];

    if (!ticketCount) {
      console.error("[Toss] Unexpected confirmed amount:", confirmedAmount);
      return sb.applyCookies(NextResponse.json(
        { error: "결제 금액이 유효하지 않습니다." },
        { status: 400 }
      ));
    }

    // ─── DB-level idempotency + first-purchase race guard ───
    // HIGH #2 FIX: Claim orderId in metadata BEFORE incrementing tickets
    // so concurrent requests on different Edge isolates see it and abort.
    let metadata: Record<string, unknown> = {};
    let processedOrderIds: string[] = [];
    try {
      const { data: profile, error: metaErr } = await sb.client
        .from("profiles")
        .select("metadata")
        .eq("id", user.id)
        .single();
      if (!metaErr && profile) {
        metadata = (profile.metadata as Record<string, unknown>) || {};
        processedOrderIds = (metadata.processed_orders as string[]) || [];
      }
    } catch {
      // metadata column doesn't exist — skip dedup check, rely on in-memory dedup
    }

    // DB-level dedup: check if orderId already processed across all isolates
    if (processedOrderIds.includes(orderId)) {
      markOrderProcessed(orderId); // Sync in-memory state
      return sb.applyCookies(NextResponse.json({
        success: true, alreadyProcessed: true,
      }));
    }

    // HIGH #1 FIX: Post-confirmation first-purchase race guard
    // If another concurrent request already claimed the first-purchase discount,
    // log a security warning (payment confirmed by Toss — still grant tickets but flag for review)
    if (confirmedAmount === 3920 && metadata.first_purchase_claimed) {
      console.warn(
        `[SECURITY] First-purchase discount race detected: user=${user.id.slice(0, 8)}..., ` +
        `order=${orderId}, prior_claim=${metadata.first_purchase_claimed}`
      );
    }

    // CR1-FIX: Pre-claim orderId in metadata BEFORE incrementing tickets.
    // Uses select() to verify the write succeeded and re-reads to detect concurrent claims.
    const preClaimOrders = [...processedOrderIds.slice(-19), orderId];
    const preClaimMeta = {
      ...metadata,
      processed_orders: preClaimOrders,
      ...(confirmedAmount === 3920 ? { first_purchase_claimed: orderId } : {}),
    };
    try {
      const { data: claimResult } = await sb.client
        .from("profiles")
        .update({ metadata: preClaimMeta })
        .eq("id", user.id)
        .select("metadata")
        .single();

      // CR1-FIX: After write, verify orderId count matches expectation.
      // If another isolate also wrote concurrently, the total count may differ
      // from what we expected, indicating a race condition.
      if (claimResult?.metadata) {
        const savedOrders = ((claimResult.metadata as Record<string, unknown>).processed_orders as string[]) || [];
        const orderOccurrences = savedOrders.filter((id: string) => id === orderId).length;
        if (orderOccurrences > 1) {
          // Duplicate orderId detected — another isolate also claimed this order
          console.warn(`[SECURITY] Double-claim detected for order ${orderId}, user ${user.id.slice(0, 8)}...`);
          markOrderProcessed(orderId);
          return sb.applyCookies(NextResponse.json({
            success: true, alreadyProcessed: true,
          }));
        }
      }
    } catch {
      console.warn("[Toss] metadata pre-claim failed — relying on in-memory dedup");
    }

    // ─── Atomic DB dedup via order_claims UNIQUE constraint ───
    // Strongest dedup guard — survives across Edge isolates and redeploys.
    // UNIQUE(user_id, order_id) guarantees at-most-once ticket increment.
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      try {
        const { error: claimErr } = await serviceClient
          .from("order_claims")
          .insert({ user_id: user.id, order_id: orderId });

        if (claimErr) {
          // PostgreSQL unique_violation → already claimed by another isolate
          if (claimErr.code === "23505") {
            markOrderProcessed(orderId);
            return sb.applyCookies(NextResponse.json({
              success: true,
              alreadyProcessed: true,
            }));
          }
          // Other DB errors — log but proceed (metadata dedup still protects)
          console.warn("[Toss] order_claims insert error:", claimErr.code);
        }
      } catch (claimEx) {
        // Network/timeout — log but proceed with existing dedup guards
        console.warn("[Toss] order_claims check failed:", claimEx instanceof Error ? claimEx.message : "Unknown");
      }
    }

    // ─── Atomic ticket increment ───
    let newTotal: number;
    try {
      newTotal = await incrementTickets(sb.client, user.id, ticketCount);
    } catch (ticketErr) {
      console.error(`[CRITICAL] Payment ${orderId} confirmed but ticket increment failed for user ${user.id.slice(0, 8)}...`, ticketErr);
      // HIGH #2 FIX: Rollback metadata claim to allow retry
      try {
        await sb.client
          .from("profiles")
          .update({ metadata: { ...metadata, processed_orders: processedOrderIds } })
          .eq("id", user.id);
      } catch {
        console.error("[Toss] metadata rollback failed for order:", orderId);
      }
      // Rollback order_claims row so retry is possible
      if (serviceClient) {
        try {
          await serviceClient
            .from("order_claims")
            .delete()
            .eq("user_id", user.id)
            .eq("order_id", orderId);
        } catch {
          console.error("[Toss] order_claims rollback failed for order:", orderId);
        }
      }
      // Do NOT mark in-memory as processed — allow retry
      return sb.applyCookies(NextResponse.json(
        { error: "결제는 완료되었으나 티켓 충전에 실패했습니다. 잠시 후 다시 시도하시거나 고객센터에 문의해 주세요.", code: "TICKET_INCREMENT_FAILED" },
        { status: 500 }
      ));
    }

    // Mark as processed in-memory after successful ticket increment
    markOrderProcessed(orderId);

    // KR-04: Mask user ID in logs to prevent PII leakage
    const maskedUserId = user.id.slice(0, 8) + "…";
    // Log payment method for analytics (카드/카카오페이/네이버페이/토스페이 etc.)
    // Prefer easyPay.provider for specific provider name (e.g., "카카오페이" instead of "간편결제")
    const paymentMethod = confirmData.easyPay?.provider || confirmData.method || "unknown";
    console.info(
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
