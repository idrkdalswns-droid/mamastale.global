/**
 * GET /api/tq/[id] — 딸깍 동화 세션 상세
 * SSE 복구 폴백으로도 사용 (exponential polling: 5s→10s→20s)
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:detail", { maxEntries: 200 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return NextResponse.json(
      { error: t("Errors.system.configError") },
      { status: 503 },
    );

  const user = await resolveUser(sb.client, request, "TQ-Detail");
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

  const { id } = await params;

  // UUID 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id))
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.validation.invalidSessionId") },
        { status: 400 },
      ),
    );

  const { data: session, error } = await sb.client
    .from("tq_sessions")
    .select(
      "id, user_id, status, phase, responses, generated_story, q20_text, primary_emotion, secondary_emotion, emotion_scores, story_id, cover_url, cover_status, crisis_severity, user_rating, created_at, completed_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !session)
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.sessionNotFound") },
        { status: 404 },
      ),
    );

  return sb.applyCookies(NextResponse.json({ session }));
}
