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
  if (processedEvents.has(eventId)) return true;
  processedEvents.set(eventId, now);
  return false;
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

    return expectedSig === signature;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const isValid = await verifyStripeSignature(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error("Stripe webhook verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

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
        const ticketCount = session.metadata?.ticket_count
          ? parseInt(session.metadata.ticket_count)
          : 1;

        // ─── Atomic ticket increment ───
        await incrementTickets(supabase, userId, ticketCount);

        await supabase.from("subscriptions").insert({
          user_id: userId,
          stripe_customer_id: session.customer || null,
          plan: "premium",
          status: "active",
          updated_at: new Date().toISOString(),
        });
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
            status: sub.status === "active" ? "active" : "past_due",
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

  return NextResponse.json({ received: true });
}
