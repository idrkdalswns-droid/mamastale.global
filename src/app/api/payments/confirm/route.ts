import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { incrementTickets } from "@/lib/supabase/tickets";
import { z } from "zod";
import { sendReceipt } from "@/lib/email/send-receipt";
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
  3920: 1,   // ₩3,920 = 1 ticket (론칭 할인)
  4900: 1,   // ₩4,900 = 1 ticket
  14900: 4,  // ₩14,900 = 4 tickets (4일 프로그램)
};

// ─── Zod schema for payment confirmation request ───
// mode: "widget" uses TOSS_WIDGET_SECRET_KEY (gsk_), "standard" uses TOSS_SECRET_KEY (sk_)
// Official Toss sample uses separate endpoints; we use a single endpoint with mode param
const confirmRequestSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().min(1).max(64).regex(/^order_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid order ID format"),
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

    // Confirm payment with Toss Payments API (10s timeout)
    // Base64-encode for HTTP Basic Auth (Edge-safe: TextEncoder handles non-ASCII gracefully)
    const basicAuthCredential = btoa(String.fromCharCode(...new TextEncoder().encode(`${tossSecretKey}:`)));
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

    // ─── T-1: order_claims PRIMARY dedup (strongest, cross-isolate) ───
    // Promoted to FIRST check. UNIQUE(user_id, order_id) guarantees at-most-once.
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      try {
        const { error: claimErr } = await serviceClient
          .from("order_claims")
          .insert({ user_id: user.id, order_id: orderId, status: "pending" });

        if (claimErr) {
          if (claimErr.code === "23505") {
            // P1-FIX(S7): Check existing claim status to decide action
            const { data: existingClaim } = await serviceClient
              .from("order_claims")
              .select("status")
              .eq("user_id", user.id)
              .eq("order_id", orderId)
              .single();

            if (existingClaim?.status === "confirmed") {
              // Truly already processed
              markOrderProcessed(orderId);
              return sb.applyCookies(NextResponse.json({ success: true, alreadyProcessed: true }));
            }

            if (existingClaim?.status === "rolled_back") {
              // Previous attempt failed — reclaim with CAS (only if still rolled_back)
              const { error: reclaimErr } = await serviceClient
                .from("order_claims")
                .update({ status: "pending", updated_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("order_id", orderId)
                .eq("status", "rolled_back");

              if (reclaimErr) {
                // Another isolate reclaimed first
                markOrderProcessed(orderId);
                return sb.applyCookies(NextResponse.json({ success: true, alreadyProcessed: true }));
              }
              // Fall through → metadata dedup → Toss confirm → ticket increment
            } else {
              // status='pending' — another isolate is currently processing
              await new Promise(r => setTimeout(r, 2000));
              try {
                const { data: verifyProfile } = await sb.client
                  .from("profiles")
                  .select("metadata")
                  .eq("id", user.id)
                  .single();
                const verifyMeta = (verifyProfile?.metadata as Record<string, unknown>) || {};
                const verifyOrders = (verifyMeta.processed_orders as string[]) || [];
                if (!verifyOrders.includes(orderId)) {
                  console.error(`[CRITICAL] Order ${orderId} pending but not completed. User ${user.id.slice(0, 8)}… may need manual ticket grant.`);
                }
              } catch {
                console.warn("[Toss] order_claims duplicate verification failed for:", orderId);
              }
              markOrderProcessed(orderId);
              return sb.applyCookies(NextResponse.json({ success: true, alreadyProcessed: true }));
            }
          }
          // Other DB errors — log but proceed (metadata dedup still protects)
          console.warn("[Toss] order_claims insert error:", claimErr.code);
        }
      } catch (claimEx) {
        // Network/timeout — log but proceed with existing dedup guards
        console.warn("[Toss] order_claims check failed:", claimEx instanceof Error ? claimEx.message : "Unknown");
      }
    }

    // ─── DB metadata dedup (secondary, per-profile) ───
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
      // metadata column doesn't exist — skip dedup check
    }

    // DB-level dedup: check if orderId already in metadata
    if (processedOrderIds.includes(orderId)) {
      markOrderProcessed(orderId);
      return sb.applyCookies(NextResponse.json({
        success: true, alreadyProcessed: true,
      }));
    }

    // Pre-claim orderId in metadata (belt-and-suspenders with order_claims)
    const preClaimOrders = [...processedOrderIds.slice(-19), orderId];
    const preClaimMeta = {
      ...metadata,
      processed_orders: preClaimOrders,
    };
    try {
      await sb.client
        .from("profiles")
        .update({ metadata: preClaimMeta })
        .eq("id", user.id);
    } catch {
      console.warn("[Toss] metadata pre-claim failed — order_claims already protects");
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
      // P1-FIX(S7): Mark order_claims as rolled_back (instead of DELETE, which can fail permanently)
      if (serviceClient) {
        try {
          await serviceClient
            .from("order_claims")
            .update({ status: "rolled_back", updated_at: new Date().toISOString() })
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

    // P1-FIX(S7): Update order_claims to confirmed status
    if (serviceClient) {
      try {
        await serviceClient
          .from("order_claims")
          .update({ status: "confirmed", updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("order_id", orderId);
      } catch {
        // Non-critical — claim stays as 'pending' but ticket was granted
        console.warn("[Toss] order_claims confirm update failed:", orderId);
      }
    }

    // Freemium v2: Auto-unlock all locked stories on first purchase (best-effort)
    if (serviceClient) {
      try {
        await serviceClient
          .from("stories")
          .update({ is_unlocked: true })
          .eq("user_id", user.id)
          .eq("is_unlocked", false);
      } catch {
        console.warn("[Toss] Auto-unlock stories failed for user:", user.id.slice(0, 8));
      }
    }

    // KR-04: Mask user ID in logs to prevent PII leakage
    const maskedUserId = user.id.slice(0, 8) + "…";
    // Log payment method for analytics (카드/카카오페이/네이버페이/토스페이 etc.)
    // Prefer easyPay.provider for specific provider name (e.g., "카카오페이" instead of "간편결제")
    const paymentMethod = confirmData.easyPay?.provider || confirmData.method || "unknown";
    console.info(
      `[Toss] Payment confirmed: ${confirmData.orderId}, ` +
      `method=${paymentMethod}, user=${maskedUserId}, tickets +${ticketCount}, total=${newTotal}`
    );

    // I12: fire-and-forget 결제 영수증 이메일
    if (user.email) {
      sendReceipt({
        email: user.email,
        orderId: confirmData.orderId || orderId,
        amount: confirmedAmount,
        tickets: ticketCount,
        paymentMethod: typeof paymentMethod === "string" ? paymentMethod : undefined,
      }).catch(e => console.warn("[email] 영수증 발송 실패", e.message));
    }

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
