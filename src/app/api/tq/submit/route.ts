/**
 * POST /api/tq/submit — 딸깍 동화 최종 제출 (경량)
 * 세션 검증 + status="generating" + 감정 프로필 저장 → 202 즉시 반환
 * 실제 AI 생성은 /api/tq/generate (SSE) 에서 수행
 *
 * OPTIONS: Phase 5 Q17 표시 시 프리워밍 용도
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { calculatePhaseScores, classifyEmotionProfile } from "@/lib/tq/tq-emotion-scoring";
import type { ResponseItem } from "@/lib/tq/tq-emotion-scoring";
import { validateTransition } from "@/lib/tq/tq-state-machine";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:submit", { maxEntries: 100 });

const requestSchema = z.object({
  session_id: z.string().uuid(),
  q20_text: z.string().max(2000).nullable().optional(),
});

/** Phase 5 프리워밍용 OPTIONS */
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return NextResponse.json(
      { error: t("Errors.system.configError") },
      { status: 503 },
    );

  const user = await resolveUser(sb.client, request, "TQ-Submit");
  if (!user)
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.auth.loginRequired") },
        { status: 401 },
      ),
    );

  if (!limiter.check(user.id, 3, 60_000))
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.rateLimit.tooManyRequestsShort") },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.validation.invalidRequestFormat") },
        { status: 400 },
      ),
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.validation.invalidRequestFormat") },
        { status: 400 },
      ),
    );

  const { session_id, q20_text } = parsed.data;

  // 세션 조회 + 상태 검증
  const { data: session, error: sessionError } = await sb.client
    .from("tq_sessions")
    .select("id, user_id, status, responses")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session)
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.sessionNotFound") },
        { status: 404 },
      ),
    );

  // 멱등성: 이미 generating/completed → 409
  if (session.status === "generating" || session.status === "completed")
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.alreadyProcessing"), code: "ALREADY_PROCESSING" },
        { status: 409 },
      ),
    );

  // 상태 전이 검증
  if (!validateTransition(session.status, "generating"))
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.cannotSubmitInCurrentState") },
        { status: 409 },
      ),
    );

  // 감정 프로필 계산 + 저장
  const responses: ResponseItem[] = Array.isArray(session.responses)
    ? session.responses
    : [];
  const finalScores = calculatePhaseScores(responses);
  const { primary, secondary } = classifyEmotionProfile(finalScores);

  // status → generating + 감정 프로필 + q20_text 저장
  // v1.60.3 FIX: service role key로 UPDATE (RLS가 SELECT/INSERT만 허용)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.system.configError") },
        { status: 503 },
      ),
    );
  }

  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/tq_sessions?id=eq.${session_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "generating",
        q20_text: q20_text ?? null,
        primary_emotion: primary,
        secondary_emotion: secondary ?? null,
        emotion_scores: finalScores,
      }),
    },
  );

  if (!updateRes.ok) {
    console.error("[TQ-Submit] Failed to update session:", updateRes.status);
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.story.createFailed") },
        { status: 500 },
      ),
    );
  }

  // 202 즉시 반환 — AI 생성은 GET /api/tq/generate (SSE) 에서 수행
  return sb.applyCookies(
    NextResponse.json(
      { session_id, status: "generating" },
      { status: 202 },
    ),
  );
}
