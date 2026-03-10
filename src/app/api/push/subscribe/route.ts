import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

/**
 * POST /api/push/subscribe — Save push subscription
 * DELETE /api/push/subscribe — Remove push subscription
 */

export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await sb.client.auth.getUser();
  if (authError || !user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  // Rate limit: 10 subscribe actions per minute
  const allowed = await checkRateLimitPersistent(`push_sub:${user.id}`, 10, 60);
  if (!allowed) {
    return sb.applyCookies(
      NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 })
    );
  }

  try {
    const body = await request.json();
    const { endpoint, keys } = body?.subscription || body || {};

    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof keys?.p256dh !== "string" ||
      typeof keys?.auth !== "string"
    ) {
      return sb.applyCookies(
        NextResponse.json({ error: "잘못된 구독 정보입니다." }, { status: 400 })
      );
    }

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
        NextResponse.json({ error: "구독 저장에 실패했습니다." }, { status: 500 })
      );
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user }, error: authError } = await sb.client.auth.getUser();
  if (authError || !user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  try {
    const body = await request.json();
    const endpoint = body?.endpoint;

    if (typeof endpoint !== "string") {
      return sb.applyCookies(
        NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
      );
    }

    await sb.client
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
    );
  }
}
