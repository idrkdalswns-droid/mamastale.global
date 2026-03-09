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

  // ─── Event ID idempotency check ───
  if (event.id && isEventProcessed(event.id)) {
    console.log(`[Stripe] Duplicate event skipped: ${event.id}`);
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("[Stripe] Checkout completed:", session.id);

      if (supabase && session.metadata?.user_id) {
        const userId = session.metadata.user_id;
        // KR-05: Validate metadata values
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
          console.error("[Stripe] Invalid user_id in metadata");
          break;
        }

        // R4-C8: Prefer session metadata (set at checkout) for ticket count
        // Falls back to amount mapping for legacy sessions or coupons/discounts
        const STRIPE_AMOUNT_TO_TICKETS: Record<number, number> = {
          4900: 1,    // ₩4,900 = 1 ticket
          14900: 4,   // ₩14,900 = 4 tickets (bundle)
        };
        const metaTickets = parseInt(session.metadata?.ticket_count || "0", 10);
        const paidAmount = session.amount_total;
        const ticketCount = (metaTickets > 0 && metaTickets <= 10) ? metaTickets : STRIPE_AMOUNT_TO_TICKETS[paidAmount];
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
            console.log(`[Stripe] Session ${session.id} already processed (unique constraint), skipping`);
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
          // Rollback: delete the subscription record to allow retry
          await supabase.from("subscriptions").delete().eq("stripe_customer_id", session.id);
          processedEvents.delete(event.id); // Allow in-memory retry
          return NextResponse.json({ error: "Ticket increment failed" }, { status: 500 });
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      console.log("[Stripe] Subscription updated:", sub.id, sub.status);

      if (supabase) {
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
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      console.log("[Stripe] Subscription canceled:", sub.id);

      if (supabase) {
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
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
