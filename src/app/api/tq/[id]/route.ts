/**
 * GET /api/tq/[id] — 딸깍 동화 세션 상세
 * SSE 복구 폴백으로도 사용 (exponential polling: 5s→10s→20s)
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";
import { getQ1Question, getBranchQuestions } from "@/lib/tq/tq-phase1-questions";
import type { BranchTag } from "@/lib/tq/tq-phase1-questions";
import { getFallbackQuestions } from "@/lib/tq/tq-fallback-questions";
import { accumulateScores } from "@/lib/tq/tq-emotion-scoring";

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
      "id, user_id, status, phase, responses, generated_questions, generated_story, q20_text, primary_emotion, secondary_emotion, emotion_scores, story_id, cover_url, cover_status, crisis_severity, user_rating, created_at, completed_at",
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

  // ── 세션 복구용: 현재 phase의 질문 재생성 ──
  let current_questions = null;
  if (session.status === "in_progress") {
    const responses = Array.isArray(session.responses) ? session.responses : [];
    const gq = typeof session.generated_questions === "object" && session.generated_questions
      ? (session.generated_questions as Record<string, unknown>)
      : {};

    if (session.phase === 1) {
      // Phase 1: 정적 질문
      const { count: visitCount } = await sb.client
        .from("tq_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const vc = visitCount ?? 1;

      if (responses.length === 0) {
        // Q1도 안 답함 → Q1 반환
        current_questions = [getQ1Question(vc)];
      } else {
        // Q1은 답함 → branch questions (Q2-Q4) 반환
        const branchTag = (gq.phase1_branch as BranchTag) ?? "warmth";
        current_questions = getBranchQuestions(branchTag, vc);
      }
    } else {
      // Phase 2-5: generated_questions에서 저장된 질문 반환
      const phaseKey = `phase${session.phase}`;
      const phaseQuestions = gq[phaseKey];
      if (phaseQuestions && typeof phaseQuestions === "object" && "questions" in (phaseQuestions as Record<string, unknown>)) {
        current_questions = (phaseQuestions as { questions: unknown[] }).questions;
      } else if (Array.isArray(phaseQuestions)) {
        current_questions = phaseQuestions;
      } else {
        // 폴백: 감정 스코어 기반 질문 생성
        const accScores = accumulateScores(responses);
        current_questions = getFallbackQuestions(session.phase, accScores);
      }
    }
  }

  // generated_questions는 내부 데이터이므로 응답에서 제외
  const { generated_questions: _gq, ...sessionData } = session;
  void _gq;

  // 폴링 모드에서 진행률 업데이트용 scenes_count
  const scenes_count = Array.isArray(session.generated_story)
    ? session.generated_story.length
    : 0;

  return sb.applyCookies(
    NextResponse.json({ session: sessionData, current_questions, scenes_count }),
  );
}
