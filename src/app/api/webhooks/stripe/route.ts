import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { incrementTickets } from "@/lib/supabase/tickets";

export const runtime = "edge";

// ─── Timestamp tolerance: 5 minutes ───
const TIMESTAMP_TOLERANCE_SEC = 300;

// ─── Event ID deduplication (per-isolate, in-memory) ───
const processedEvents = new Map<string, number>();
const DEDUP_TTL_MS = 600_000; // 10 minutes

function isEventProcessed(eventId: string): boolean {
  const now = Date.now();
  // Lazy cleanup
  if (processedEvents.size > 500) {
    for (const [id, ts] of processedEvents) {
      if (now - ts > DEDUP_TTL_MS) processedEvents.delete(id);
    }
  }
  return processedEvents.has(eventId);
}

// Simple HMAC-based signature verification for Edge Runtime
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const pairs = sigHeader.split(",");
    const timestamp = pairs.find((p) => p.startsWith("t="))?.split("=")[1];
    const signature = pairs.find((p) => p.startsWith("v1="))?.split("=").slice(1).join("=");

    if (!timestamp || !signature) return false;

    // ─── Timestamp tolerance check ───
    // R4-FIX: Validate timestamp is numeric before parseInt (NaN bypass defense)
    if (!/^\d+$/.test(timestamp)) {
      console.error("[Stripe] Non-numeric timestamp in signature header");
      return false;
    }
    const eventTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - eventTime) > TIMESTAMP_TOLERANCE_SEC) {
      console.error("[Stripe] Webhook timestamp too old:", currentTime - eventTime, "seconds");
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    if (expectedSig.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      result |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// CTO-FIX: Body size limit to prevent memory exhaustion
const MAX_WEBHOOK_BODY = 64_000; // 64KB — Stripe events are typically < 10KB

export async function POST(request: NextRequest) {
  // Check content-length before reading body
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_WEBHOOK_BODY) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await request.text();
  if (body.length > MAX_WEBHOOK_BODY) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const isValid = await verifyStripeSignature(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error("Stripe webhook verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // IN-3: Wrap JSON.parse in try-catch to prevent unhandled exception on malformed payload
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    console.error("[Stripe] Webhook body is not valid JSON");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // ─── Event ID idempotency check (in-memory + DB) ───
  // In-memory Map은 보조 캐시, DB가 소스 오브 트루스 (v1.22.2 Bug Bounty #1)
  if (event.id && isEventProcessed(event.id)) {
    console.info(`[Stripe] Duplicate event skipped (memory): ${event.id}`);
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceRoleClient();

  // DB-level deduplication — Edge 격리체 재시작 시에도 안전
  if (supabase && event.id) {
    const { error: dupErr } = await supabase
      .from("stripe_processed_events")
      .insert({ event_id: event.id });
    if (dupErr?.code === "23505") {
      console.info(`[Stripe] Duplicate event skipped (DB): ${event.id}`);
      return NextResponse.json({ received: true });
    }
    // INSERT 성공 또는 테이블 미존재 시 계속 진행
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.info("[Stripe] Checkout completed:", session.id);

      if (supabase && session.metadata?.user_id) {
        const userId = session.metadata.user_id;
        // KR-05: Validate metadata values
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
          console.error("[Stripe] Invalid user_id in metadata");
          break;
        }

        // Fix 3: Currency allowlist — Korean mothers paying from overseas (USD/JPY)
        const ALLOWED_CURRENCIES = ["krw", "usd", "jpy"];
        if (session.currency && !ALLOWED_CURRENCIES.includes(session.currency.toLowerCase())) {
          console.warn(`[Stripe] Unexpected currency: ${session.currency}, session: ${session.id}`);
          break;
        }

        // v1.22.2 Bug Bounty #4: amount 우선, metadata는 폴백만
        // metadata는 클라이언트 조작 가능 → Stripe 확인 금액이 소스 오브 트루스
        const STRIPE_AMOUNT_TO_TICKETS: Record<number, number> = {
          3920: 1,    // ₩3,920 = 1 ticket (20% discount)
          4900: 1,    // ₩4,900 = 1 ticket
          14900: 4,   // ₩14,900 = 4 tickets (bundle)
        };
        const paidAmount = session.amount_total;
        // F-015 FIX: Remove metadata fallback — only trust server-side amount mapping
        // ⚠️ When adding new prices, update STRIPE_AMOUNT_TO_TICKETS above
        const ticketCount = STRIPE_AMOUNT_TO_TICKETS[paidAmount];
        if (!ticketCount) {
          console.error(`[Stripe] Unknown payment amount: ${paidAmount}, session: ${session.id}`);
          break; // Return 200 to stop Stripe retries, log for manual review
        }

        // P1-3 FIX: INSERT subscription record BEFORE incrementing tickets
        // If INSERT fails with unique violation, another isolate already processed this session
        const { error: subInsertErr } = await supabase.from("subscriptions").insert({
          user_id: userId,
          stripe_customer_id: session.id,
          stripe_subscription_id: session.subscription || session.id,
          plan: "premium",
          status: "active",
          updated_at: new Date().toISOString(),
        });
        if (subInsertErr) {
          // Check if it's a unique violation (already processed)
          if (subInsertErr.code === "23505") {
            // v1.22.3: Check if previous attempt failed at ticket increment
            const { data: existingSub } = await supabase.from("subscriptions")
              .select("status")
              .eq("stripe_customer_id", session.id)
              .maybeSingle();
            if (existingSub?.status === "ticket_failed") {
              // Previous attempt failed — retry ticket increment only
              console.info(`[Stripe] Retrying ticket increment for ticket_failed session: ${session.id}`);
              try {
                await incrementTickets(supabase, userId, ticketCount);
                await supabase.from("subscriptions")
                  .update({ status: "active" })
                  .eq("stripe_customer_id", session.id);
                console.info(`[Stripe] Ticket retry succeeded for session: ${session.id}`);
              } catch (retryErr) {
                console.error("[Stripe] Ticket retry also failed:", retryErr);
                return NextResponse.json({ error: "Ticket retry failed" }, { status: 500 });
              }
            } else {
              console.info(`[Stripe] Session ${session.id} already processed (status: ${existingSub?.status}), skipping`);
            }
            break;
          }
          console.error("[Stripe] Subscription insert failed:", subInsertErr.code, subInsertErr.message);
          // Non-unique error → allow Stripe to retry
          return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
        }

        // ─── Atomic ticket increment (only reached if INSERT succeeded) ───
        try {
          await incrementTickets(supabase, userId, ticketCount);
        } catch (err) {
          console.error("[Stripe] Ticket increment failed:", err);
          // v1.22.3: Mark as ticket_failed instead of DELETE — preserves idempotency
          // Stripe will retry → webhook sees ticket_failed → can re-attempt increment
          try {
            await supabase.from("subscriptions")
              .update({ status: "ticket_failed" })
              .eq("stripe_customer_id", session.id);
          } catch (updateErr) {
            console.error("[Stripe] Failed to mark ticket_failed:", updateErr);
          }
          processedEvents.delete(event.id); // Allow in-memory retry
          return NextResponse.json({ error: "Ticket increment failed" }, { status: 500 });
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      console.info("[Stripe] Subscription updated:", sub.id, sub.status);

      if (supabase) {
        // R4-4: Idempotency — only apply if event is newer than last update
        const eventTime = new Date(event.created * 1000).toISOString();
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("updated_at")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        if (existing && existing.updated_at >= eventTime) {
          console.info(`[Stripe] Stale subscription update skipped: ${sub.id}`);
          break;
        }

        const periodStart = sub.items?.data?.[0]?.current_period_start;
        const periodEnd = sub.items?.data?.[0]?.current_period_end;

        await supabase
          .from("subscriptions")
          .update({
            // R8-1: Only use statuses matching DB CHECK constraint (active, past_due, canceled, trialing)
            status: ["active", "past_due", "canceled", "trialing"].includes(sub.status) ? sub.status : "past_due",
            ...(periodStart && {
              current_period_start: new Date(periodStart * 1000).toISOString(),
            }),
            ...(periodEnd && {
              current_period_end: new Date(periodEnd * 1000).toISOString(),
            }),
            updated_at: eventTime,
          })
          .eq("stripe_subscription_id", sub.id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      console.info("[Stripe] Subscription canceled:", sub.id);

      if (supabase) {
        // R4-4: Idempotency — only apply if event is newer
        const eventTime = new Date(event.created * 1000).toISOString();
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("updated_at")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        if (existing && existing.updated_at >= eventTime) {
          console.info(`[Stripe] Stale subscription delete skipped: ${sub.id}`);
          break;
        }

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: eventTime,
          })
          .eq("stripe_subscription_id", sub.id);
      }
      break;
    }
  }

  // Mark event as processed AFTER successful handling
  if (event.id) {
    processedEvents.set(event.id, Date.now());
  }

  return NextResponse.json({ received: true });
}
