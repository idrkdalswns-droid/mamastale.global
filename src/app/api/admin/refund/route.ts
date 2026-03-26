/**
 * B1-Toss Admin Refund API
 *
 * POST /api/admin/refund
 * Admin-only endpoint to process Toss Payments refunds.
 * Calls Toss REST API, decrements tickets, updates subscription status.
 *
 * @module admin-refund
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { z } from "zod";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);
const adminLimiter = createInMemoryLimiter(RATE_KEYS.ADMIN, { maxEntries: 50 });

const refundSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  cancelReason: z.string().min(1).max(500).default("관리자 환불 처리"),
  // Optional: partial refund amount (omit for full refund)
  cancelAmount: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!adminLimiter.check(ip, 5, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // ─── Auth check (same pattern as admin/observability) ───
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || !serviceKey) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });

  // Authenticate admin
  let adminUserId: string | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user && ADMIN_USER_IDS.includes(user.id)) {
    adminUserId = user.id;
  } else {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await supabase.auth.getUser(authHeader.slice(7));
      if (tokenData.user && ADMIN_USER_IDS.includes(tokenData.user.id)) {
        adminUserId = tokenData.user.id;
      }
    }
  }

  if (!adminUserId) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  // ─── Parse request ───
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: "입력값이 올바르지 않습니다.",
      details: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const { paymentKey, cancelReason, cancelAmount } = parsed.data;

  // ─── Call Toss Payments Cancel API ───
  const tossSecretKey = process.env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    return NextResponse.json({ error: "Toss 결제 설정이 없습니다.", code: "MISSING_TOSS_KEY" }, { status: 503 });
  }

  const basicAuth = btoa(String.fromCharCode(
    ...new TextEncoder().encode(`${tossSecretKey}:`)
  ));

  const cancelBody: Record<string, unknown> = { cancelReason };
  if (cancelAmount) cancelBody.cancelAmount = cancelAmount;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

  let tossResponse;
  try {
    tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelBody),
        signal: controller.signal,
      }
    );
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error("[Admin Refund] Toss API call failed:", isAbort ? "timeout" : err);
    return NextResponse.json({
      error: isAbort ? "Toss API 응답 시간 초과 (10초)" : "Toss API 호출에 실패했습니다.",
      code: isAbort ? "TOSS_TIMEOUT" : "TOSS_ERROR",
    }, { status: 502 });
  }
  clearTimeout(timeout);

  if (!tossResponse.ok) {
    const errBody = await tossResponse.json().catch(() => ({}));
    console.error("[Admin Refund] Toss API error:", tossResponse.status, errBody);
    return NextResponse.json({
      error: `Toss 환불 실패: ${(errBody as { message?: string }).message || tossResponse.statusText}`,
      code: (errBody as { code?: string }).code || "TOSS_CANCEL_FAILED",
      tossStatus: tossResponse.status,
    }, { status: 422 });
  }

  const tossResult = await tossResponse.json() as {
    orderId?: string;
    totalAmount?: number;
    cancels?: Array<{ cancelAmount: number }>;
    status?: string;
  };

  console.log("[Admin Refund] Toss cancel success:", {
    paymentKey: paymentKey.slice(0, 10) + "...",
    orderId: tossResult.orderId,
    status: tossResult.status,
  });

  // ─── Update DB: find user, decrement tickets, update subscription ───
  const serviceSupabase = createServerClient(supabaseUrl, serviceKey, {
    cookies: { getAll() { return []; }, setAll() {} },
  });

  // Find subscription by payment key or order ID
  const { data: subscription } = await serviceSupabase
    .from("subscriptions")
    .select("id, user_id, metadata, status")
    .or(`metadata->>payment_key.eq.${paymentKey},metadata->>orderId.eq.${tossResult.orderId || ""}`)
    .single();

  let ticketAction = "skipped";
  let subscriptionAction = "not_found";

  if (subscription) {
    const userId = subscription.user_id;

    // Decrement tickets (best-effort)
    const refundedAmount = cancelAmount || tossResult.totalAmount || 0;
    if (refundedAmount > 0) {
      try {
        // Try to find ticket count from pricing
        const { resolveTicketType } = await import("@/lib/constants/pricing");
        const ticketInfo = resolveTicketType(refundedAmount);
        if (ticketInfo) {
          const { error: rpcErr } = await serviceSupabase.rpc("decrement_tickets_refund", {
            p_user_id: userId,
            p_count: ticketInfo.tickets,
          });
          ticketAction = rpcErr ? `error: ${rpcErr.code}` : `decremented ${ticketInfo.tickets}`;
        } else {
          ticketAction = `unknown_amount: ${refundedAmount}`;
        }
      } catch (err) {
        ticketAction = `exception: ${(err as Error).message}`;
      }
    }

    // Update subscription status
    if (subscription.status !== "refunded") {
      const { error: updateErr } = await serviceSupabase
        .from("subscriptions")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", subscription.id);
      subscriptionAction = updateErr ? `error: ${updateErr.code}` : "refunded";
    } else {
      subscriptionAction = "already_refunded";
    }
  }

  // Slack notification (fire-and-forget)
  const slackUrl = process.env.SLACK_CRISIS_WEBHOOK_URL;
  if (slackUrl) {
    fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `💰 [Admin Refund] paymentKey: ${paymentKey.slice(0, 10)}... | orderId: ${tossResult.orderId || "N/A"} | tickets: ${ticketAction} | subscription: ${subscriptionAction} | by: ${adminUserId.slice(0, 8)}...`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    toss: {
      orderId: tossResult.orderId,
      status: tossResult.status,
      cancels: tossResult.cancels,
    },
    db: {
      ticketAction,
      subscriptionAction,
    },
  });
}
