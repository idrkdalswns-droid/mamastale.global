import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("free_stories_remaining")
          .eq("id", userId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              free_stories_remaining:
                (profile.free_stories_remaining || 0) + ticketCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }

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
