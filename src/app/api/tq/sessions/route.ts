/**
 * GET /api/tq/sessions — 딸깍 동화 세션 목록
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:sessions", { maxEntries: 200 });

export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return NextResponse.json(
      { error: t("Errors.system.configError") },
      { status: 503 },
    );

  const user = await resolveUser(sb.client, request, "TQ-Sessions");
  if (!user)
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.auth.loginRequired") },
        { status: 401 },
      ),
    );

  if (!limiter.check(user.id, 30, 60_000))
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.rateLimit.tooManyRequestsShort") },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );

  const { data: sessions, error } = await sb.client
    .from("tq_sessions")
    .select(
      "id, status, phase, primary_emotion, secondary_emotion, story_id, cover_url, cover_status, created_at, completed_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[TQ-Sessions] Query failed:", error.message);
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.sessionListFailed") },
        { status: 500 },
      ),
    );
  }

  return sb.applyCookies(NextResponse.json({ sessions: sessions ?? [] }));
}
