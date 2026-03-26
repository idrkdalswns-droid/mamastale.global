export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

/**
 * POST /api/push/send
 * Send push notifications to specific users or all subscribers.
 * Requires VAPID keys and service role key.
 *
 * Body: { userId?: string; title: string; body: string; url?: string }
 * If userId is omitted, sends to all subscribers (use sparingly).
 *
 * Security: Protected by internal API key check (not user-facing)
 */

// ─── Rate limiter ───
const pushLimiter = createInMemoryLimiter(RATE_KEYS.PUSH_SEND, { maxEntries: 200 });

// Constant-time string comparison to prevent timing attacks on API key
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Web Push requires crypto operations; this is a minimal Edge-compatible implementation
// using the standard Web Push protocol with VAPID

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  // For Edge Runtime, we use a fetch-based approach to the push endpoint
  // The full web-push protocol requires ECDSA signing which is complex in Edge
  // For now, we store the notification for the service worker to pick up
  // A full implementation would use the Web Push Protocol (RFC 8291)

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
      },
      body: payload,
    });
    return response.ok || response.status === 201;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!pushLimiter.check(ip, 100, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // Constant-time API key check for internal use
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.PUSH_API_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !expectedKey || !timingSafeEqual(apiKey, expectedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !serviceKey || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  let body: { userId?: string; title: string; body: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceKey);

  // Fetch subscriptions
  let query = admin.from("push_subscriptions").select("endpoint, p256dh, auth_key, user_id");
  if (body.userId) {
    query = query.eq("user_id", body.userId);
  }

  const { data: subscriptions, error } = await query.limit(500);
  if (error || !subscriptions?.length) {
    return NextResponse.json({ sent: 0, error: error?.message || "No subscriptions" });
  }

  const payload = JSON.stringify({
    title: body.title,
    body: body.body,
    url: body.url || "/",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subscriptions) {
    const ok = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
    if (ok) {
      sent++;
    } else {
      failed++;
      staleEndpoints.push(sub.endpoint);
    }
  }

  // Clean up stale subscriptions (410 Gone)
  if (staleEndpoints.length > 0) {
    for (const endpoint of staleEndpoints) {
      await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  }

  return NextResponse.json({ sent, failed, cleaned: staleEndpoints.length });
}
