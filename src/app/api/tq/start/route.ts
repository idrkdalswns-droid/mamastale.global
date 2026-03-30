/**
 * POST /api/tq/start — 딸깍 동화 세션 시작
 * 티켓 hold + 세션 생성 + Phase 1 Q1 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { getQ1Question } from "@/lib/tq/tq-phase1-questions";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:start", { maxEntries: 200 });

const requestSchema = z.object({
  idempotency_key: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return NextResponse.json(
      { error: t("Errors.system.configError") },
      { status: 503 },
    );

  const user = await resolveUser(sb.client, request, "TQ-Start");
  if (!user)
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.auth.loginRequired") },
        { status: 401 },
      ),
    );

  if (!limiter.check(user.id, 10, 60_000))
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.rateLimit.tooManyRequests") },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );

  // JSON 파싱
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

  const { idempotency_key } = parsed.data;

  // 기존 진행 중 세션 확인
  const { data: existingSession } = await sb.client
    .from("tq_sessions")
    .select("id, phase, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSession) {
    return sb.applyCookies(
      NextResponse.json({
        existing_session: {
          id: existingSession.id,
          phase: existingSession.phase,
          created_at: existingSession.created_at,
        },
        message: t("Errors.teacher.existingSession"),
      }),
    );
  }

  // 무료 체험 확인
  const { data: profile } = await sb.client
    .from("profiles")
    .select("free_stories_remaining, tq_free_trial_used_at")
    .eq("id", user.id)
    .single();

  const isFreeTrialAvailable =
    profile && !profile.tq_free_trial_used_at && profile.free_stories_remaining <= 0;
  const hasTickets = profile && profile.free_stories_remaining > 0;

  if (!hasTickets && !isFreeTrialAvailable) {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.ticket.passInsufficient"), code: "NO_TICKETS" },
        { status: 402 },
      ),
    );
  }

  // 세션 생성
  const { data: session, error: sessionError } = await sb.client
    .from("tq_sessions")
    .insert({
      user_id: user.id,
      phase: 1,
      status: "in_progress",
      is_free_trial: isFreeTrialAvailable && !hasTickets,
      idempotency_key,
      responses: [],
    })
    .select("id")
    .single();

  if (sessionError) {
    // 멱등성 키 중복 → 이미 생성된 세션
    if (sessionError.code === "23505") {
      const { data: dupSession } = await sb.client
        .from("tq_sessions")
        .select("id, phase, status")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotency_key)
        .single();

      if (dupSession) {
        return sb.applyCookies(
          NextResponse.json({
            session_id: dupSession.id,
            status: dupSession.status,
            message: t("Errors.teacher.duplicateSession"),
          }),
        );
      }
    }
    console.error("[TQ-Start] Session creation failed:", sessionError.message);
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.sessionCreateFailedShort") },
        { status: 500 },
      ),
    );
  }

  // 티켓 hold (무료 체험이면 무료 체험 마킹)
  if (isFreeTrialAvailable && !hasTickets) {
    await sb.client
      .from("profiles")
      .update({ tq_free_trial_used_at: new Date().toISOString() })
      .eq("id", user.id);
  } else {
    const { data: holdResult } = await sb.client.rpc("tq_hold_ticket", {
      p_user_id: user.id,
      p_session_id: session.id,
      p_idempotency_key: idempotency_key,
    });

    if (!holdResult) {
      // hold 실패 → 세션 정리
      await sb.client.from("tq_sessions").delete().eq("id", session.id);
      return sb.applyCookies(
        NextResponse.json(
          { error: t("Errors.ticket.passInsufficient"), code: "NO_TICKETS" },
          { status: 402 },
        ),
      );
    }
  }

  // 방문 횟수 기반 Q1 세트 선택
  const { count: visitCount } = await sb.client
    .from("tq_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const vc = visitCount ?? 1;
  const q1Question = getQ1Question(vc);

  return sb.applyCookies(
    NextResponse.json({
      session_id: session.id,
      phase: 1,
      question: q1Question,
      visit_count: vc,
    }),
  );
}
