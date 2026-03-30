import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().max(256), auth: z.string().max(256) }),
});
const unsubscribeSchema = z.object({ endpoint: z.string().url().max(2048) });

/**
 * POST /api/push/subscribe — Save push subscription
 * DELETE /api/push/subscribe — Remove push subscription
 */

export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const { data: { user }, error: authError } = await sb.client.auth.getUser();
  if (authError || !user) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
    );
  }

  // Rate limit: 10 subscribe actions per minute
  const allowed = await checkRateLimitPersistent(`push_sub:${user.id}`, 10, 60);
  if (!allowed) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.rateLimit.tooManyRequestsShort") }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  try {
    const body = await request.json();
    const raw = body?.subscription || body || {};
    const parsed = subscribeSchema.safeParse(raw);
    if (!parsed.success) {
      return sb.applyCookies(
        NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 })
      );
    }

    const { endpoint, keys } = parsed.data;

    // Upsert: if same endpoint exists, update keys
    const { error } = await sb.client
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) {
      console.error("[Push] Subscribe error:", error.code, error.message);
      return sb.applyCookies(
        NextResponse.json({ error: t("Errors.push.subscribeFailed") }, { status: 500 })
      );
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 })
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const { data: { user }, error: authError } = await sb.client.auth.getUser();
  if (authError || !user) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
    );
  }

  // Rate limit: 10 unsubscribe actions per minute
  const allowed = await checkRateLimitPersistent(`push_unsub:${user.id}`, 10, 60);
  if (!allowed) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.rateLimit.tooManyRequestsShort") }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  try {
    const body = await request.json();
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(
        NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 })
      );
    }

    const { endpoint } = parsed.data;

    await sb.client
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 })
    );
  }
}
