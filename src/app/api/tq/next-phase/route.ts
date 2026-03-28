/**
 * POST /api/tq/next-phase — 딸깍 동화 답변 제출 + 다음 질문 반환
 * Phase 1: 정적 분기 (AI 비용 0)
 * Phase 2-5 전환: Haiku 에이전트 호출 + Zod 검증 + 폴백
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { getBranchQuestions } from "@/lib/tq/tq-phase1-questions";
import type { BranchTag } from "@/lib/tq/tq-phase1-questions";
import { accumulateScores } from "@/lib/tq/tq-emotion-scoring";
import type { EmotionScores, ResponseItem } from "@/lib/tq/tq-emotion-scoring";
import { getFallbackQuestions } from "@/lib/tq/tq-fallback-questions";
import {
  HAIKU_CONFIG,
  PHASE_TRANSITION_SYSTEM_PROMPT,
  buildPhaseTransitionUserPrompt,
  phaseTransitionOutputSchema,
  phase5OutputSchema,
} from "@/lib/tq/tq-phase-transition";
import type {
  PhaseTransitionInput,
  GeneratedQuestion,
  Phase5Output,
} from "@/lib/tq/tq-phase-transition";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:next-phase", { maxEntries: 200 });

const requestSchema = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().regex(/^q\d{1,2}$/),
  choice_id: z.number().int().min(1).max(4),
  choice_text: z.string().max(100),
  scores: z.object({
    burnout: z.number().int().min(0).max(100),
    guilt: z.number().int().min(0).max(100),
    identity_loss: z.number().int().min(0).max(100),
    loneliness: z.number().int().min(0).max(100),
    hope: z.number().int().min(0).max(100),
  }),
});

// Phase 전환이 일어나는 질문 ID
const PHASE_TRANSITION_QUESTIONS: Record<string, number> = {
  q4: 2,   // Phase 1 → 2
  q8: 3,   // Phase 2 → 3
  q12: 4,  // Phase 3 → 4
  q16: 5,  // Phase 4 → 5
};

// Q1 → 분기 태그 매핑 (choice_id → BranchTag)
const CHOICE_TO_BRANCH_TAG: Record<number, BranchTag> = {
  1: "warmth",
  2: "melancholy",
  3: "overwhelm",
  4: "confusion",
};

export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return NextResponse.json(
      { error: "시스템 설정 오류입니다." },
      { status: 503 },
    );

  const user = await resolveUser(sb.client, request, "TQ-NextPhase");
  if (!user)
    return sb.applyCookies(
      NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    );

  if (!limiter.check(user.id, 10, 60_000))
    return sb.applyCookies(
      NextResponse.json(
        { error: "요청이 너무 많습니다." },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 },
      ),
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return sb.applyCookies(
      NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 },
      ),
    );

  const { session_id, question_id, choice_id, choice_text, scores } = parsed.data;

  // 세션 조회
  const { data: session, error: sessionError } = await sb.client
    .from("tq_sessions")
    .select("id, user_id, phase, responses, status, generated_questions")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session)
    return sb.applyCookies(
      NextResponse.json(
        { error: "세션을 찾을 수 없습니다." },
        { status: 404 },
      ),
    );

  if (session.status !== "in_progress")
    return sb.applyCookies(
      NextResponse.json(
        { error: "이미 완료된 세션입니다." },
        { status: 409 },
      ),
    );

  // 응답 저장
  const responses: ResponseItem[] = Array.isArray(session.responses)
    ? session.responses
    : [];

  responses.push({
    phase: session.phase,
    question_id: question_id,
    scores: scores as EmotionScores,
  });

  // ── Q1 답변: Phase 1 내부 분기 (AI 호출 없음) ──
  if (question_id === "q1") {
    const branchTag = CHOICE_TO_BRANCH_TAG[choice_id] ?? "warmth";

    // 방문 횟수 조회
    const { count: visitCount } = await sb.client
      .from("tq_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const vc = visitCount ?? 1;
    const branchQuestions = getBranchQuestions(branchTag, vc);

    // 세션 업데이트 (응답 저장 + 분기 메타데이터)
    await sb.client
      .from("tq_sessions")
      .update({
        responses,
        generated_questions: {
          phase1_branch: branchTag,
          visit_count: vc,
        },
      })
      .eq("id", session_id);

    return sb.applyCookies(
      NextResponse.json({
        questions: branchQuestions,
        phase: 1,
        ai_generated: false,
      }),
    );
  }

  // ── Q2, Q3 답변: Phase 1 내부 (다음 질문은 이미 반환됨) ──
  if (question_id === "q2" || question_id === "q3") {
    await sb.client
      .from("tq_sessions")
      .update({ responses })
      .eq("id", session_id);

    return sb.applyCookies(
      NextResponse.json({
        phase: 1,
        acknowledged: true,
      }),
    );
  }

  // ── Phase 전환 질문 (q4, q8, q12, q16) ──
  const targetPhase = PHASE_TRANSITION_QUESTIONS[question_id];

  if (targetPhase) {
    // Phase 업데이트
    await sb.client
      .from("tq_sessions")
      .update({ responses, phase: targetPhase })
      .eq("id", session_id);

    // 누적 스코어 계산
    const accScores = accumulateScores(responses);

    // Haiku 에이전트 호출
    const previousResponses = responses.map((r) => ({
      questionId: r.question_id,
      choiceId: 0, // choice_id는 프론트에서 관리
      choiceText: "", // 텍스트는 scores에서 추론
    }));

    const input: PhaseTransitionInput = {
      targetPhase,
      accumulatedScores: accScores,
      previousResponses,
    };

    try {
      const questions = await callHaikuAgent(input);

      // 생성된 질문 저장
      await sb.client
        .from("tq_sessions")
        .update({
          generated_questions: {
            ...(typeof session.generated_questions === "object"
              ? session.generated_questions
              : {}),
            [`phase${targetPhase}`]: questions,
          },
        })
        .eq("id", session_id);

      return sb.applyCookies(
        NextResponse.json({
          ...questions,
          phase: targetPhase,
          ai_generated: true,
        }),
      );
    } catch (err) {
      console.error(`[TQ-NextPhase] Haiku failed for phase ${targetPhase}:`, err);

      // 폴백: 반개인화 질문 세트
      const fallbackQuestions = getFallbackQuestions(targetPhase, accScores);
      return sb.applyCookies(
        NextResponse.json({
          questions: fallbackQuestions,
          phase: targetPhase,
          ai_generated: false,
          fallback: true,
        }),
      );
    }
  }

  // ── 일반 답변 (q5~q7, q9~q11, q13~q15, q17~q19): 응답만 저장 ──
  await sb.client
    .from("tq_sessions")
    .update({ responses })
    .eq("id", session_id);

  return sb.applyCookies(
    NextResponse.json({
      phase: session.phase,
      acknowledged: true,
    }),
  );
}

/* ═══════════════════════════════════════════════════════
   Haiku 에이전트 호출
   ═══════════════════════════════════════════════════════ */

async function callHaikuAgent(
  input: PhaseTransitionInput,
): Promise<{ questions: GeneratedQuestion[] } | Phase5Output> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const anthropic = new Anthropic({ apiKey });
  const userPrompt = buildPhaseTransitionUserPrompt(input);
  const isPhase5 = input.targetPhase === 5;

  for (let attempt = 0; attempt <= HAIKU_CONFIG.maxRetries; attempt++) {
    const temperature =
      attempt === 0 ? HAIKU_CONFIG.temperature : HAIKU_CONFIG.retryTemperature;

    const response = await Promise.race([
      anthropic.messages.create({
        model: HAIKU_CONFIG.model,
        max_tokens: HAIKU_CONFIG.maxTokens,
        temperature,
        system: PHASE_TRANSITION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      timeoutPromise(HAIKU_CONFIG.timeoutMs),
    ]);

    if (!response || !("content" in response)) {
      if (attempt < HAIKU_CONFIG.maxRetries) continue;
      throw new Error("Haiku timeout");
    }

    // 텍스트 추출
    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // JSON 파싱
    let parsed;
    try {
      // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[1]);
    } catch {
      if (attempt < HAIKU_CONFIG.maxRetries) continue;
      throw new Error("JSON parse failed after retries");
    }

    // Zod 검증
    const schema = isPhase5 ? phase5OutputSchema : phaseTransitionOutputSchema;
    const zodResult = schema.safeParse(parsed);

    if (!zodResult.success) {
      if (attempt < HAIKU_CONFIG.maxRetries) continue;
      throw new Error(`Zod validation failed: ${zodResult.error.message}`);
    }

    return zodResult.data as
      | { questions: GeneratedQuestion[] }
      | Phase5Output;
  }

  throw new Error("Haiku agent exhausted retries");
}

function timeoutPromise(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}
