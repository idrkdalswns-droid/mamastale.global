/**
 * POST /api/tq/submit — 딸깍 동화 최종 제출 + 비동기 동화 생성
 * Node.js Runtime (maxDuration 300s)
 * 202 즉시 반환 → 서버에서 비동기 생성 계속
 *
 * OPTIONS: Phase 5 Q17 표시 시 프리워밍 용도
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { calculatePhaseScores, classifyEmotionProfile } from "@/lib/tq/tq-emotion-scoring";
import type { ResponseItem, EmotionScores } from "@/lib/tq/tq-emotion-scoring";
import { validateTransition } from "@/lib/tq/tq-state-machine";
import {
  SONNET_CONFIG,
  ORCHESTRATOR_SYSTEM_PROMPT,
  buildOrchestratorUserMessage,
  parseTQScenes,
} from "@/lib/tq/tq-orchestrator";
import { getFallbackStory } from "@/lib/tq/tq-fallback-stories";

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
      { error: "시스템 설정 오류입니다." },
      { status: 503 },
    );

  const user = await resolveUser(sb.client, request, "TQ-Submit");
  if (!user)
    return sb.applyCookies(
      NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    );

  if (!limiter.check(user.id, 3, 60_000))
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

  const { session_id, q20_text } = parsed.data;

  // 세션 조회 + 상태 검증
  const { data: session, error: sessionError } = await sb.client
    .from("tq_sessions")
    .select("*")
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

  // 멱등성: 이미 generating/completed → 409
  if (session.status === "generating" || session.status === "completed")
    return sb.applyCookies(
      NextResponse.json(
        { error: "이미 처리 중이거나 완료된 세션입니다.", code: "ALREADY_PROCESSING" },
        { status: 409 },
      ),
    );

  // 상태 전이 검증
  if (!validateTransition(session.status, "generating"))
    return sb.applyCookies(
      NextResponse.json(
        { error: "현재 상태에서 제출할 수 없습니다." },
        { status: 409 },
      ),
    );

  // status → generating + q20_text 저장
  await sb.client
    .from("tq_sessions")
    .update({
      status: "generating",
      q20_text: q20_text ?? null,
    })
    .eq("id", session_id);

  // 감정 프로필 계산
  const responses: ResponseItem[] = Array.isArray(session.responses)
    ? session.responses
    : [];
  const finalScores = calculatePhaseScores(responses);
  const { primary, secondary } = classifyEmotionProfile(finalScores);

  // 202 즉시 반환 — 비동기 생성은 서버에서 계속
  const responsePromise = sb.applyCookies(
    NextResponse.json(
      { session_id, status: "generating" },
      { status: 202 },
    ),
  );

  // 비동기 동화 생성 (waitUntil 없이 — Node.js runtime에서 maxDuration 300s 활용)
  generateStoryAsync(
    session_id,
    user.id,
    responses,
    finalScores,
    primary,
    secondary,
    q20_text ?? null,
    session.crisis_severity ?? "NONE",
  ).catch((err) => {
    console.error("[TQ-Submit] Async story generation failed:", err);
  });

  return responsePromise;
}

/* ═══════════════════════════════════════════════════════
   비동기 동화 생성
   ═══════════════════════════════════════════════════════ */

async function generateStoryAsync(
  sessionId: string,
  userId: string,
  responses: ResponseItem[],
  scores: EmotionScores,
  primaryEmotion: string,
  secondaryEmotion: string | null,
  q20Text: string | null,
  crisisSeverity: string,
): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!serviceKey || !supabaseUrl || !apiKey) {
    await updateSessionStatus(supabaseUrl!, serviceKey!, sessionId, "failed");
    await refundTicket(supabaseUrl!, serviceKey!, sessionId);
    return;
  }

  const allResponses = responses.map((r) => ({
    questionId: r.question_id,
    choiceText: "",
    phase: r.phase,
  }));

  const userMessage = buildOrchestratorUserMessage({
    scores,
    primaryEmotion: primaryEmotion as Parameters<typeof buildOrchestratorUserMessage>[0]["primaryEmotion"],
    secondaryEmotion: secondaryEmotion as Parameters<typeof buildOrchestratorUserMessage>[0]["secondaryEmotion"],
    allResponses,
    q20Text,
    crisisSeverity: crisisSeverity as "NONE" | "LOW" | "MEDIUM",
  });

  // 4-tier fallback
  let storyText: string | null = null;

  // Tier 1: Sonnet
  try {
    storyText = await callSonnet(apiKey, userMessage);
  } catch (err) {
    console.warn("[TQ-Submit] Sonnet tier 1 failed:", err);
  }

  // Tier 2: Sonnet retry (lower temperature)
  if (!storyText) {
    try {
      storyText = await callSonnet(apiKey, userMessage, 0.75);
    } catch (err) {
      console.warn("[TQ-Submit] Sonnet tier 2 failed:", err);
    }
  }

  // Tier 3: Haiku downgrade
  if (!storyText) {
    try {
      storyText = await callHaikuFallback(apiKey, userMessage);
    } catch (err) {
      console.warn("[TQ-Submit] Haiku tier 3 failed:", err);
    }
  }

  // 장면 파싱
  let scenes = storyText ? parseTQScenes(storyText) : [];

  // Tier 4: 사전 생성 폴백 동화
  if (scenes.length < 9) {
    const fallback = getFallbackStory(
      primaryEmotion as Parameters<typeof getFallbackStory>[0],
    );
    if (fallback) {
      scenes = fallback.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        title: s.title,
        text: s.text,
      }));
      console.warn("[TQ-Submit] Using pre-generated fallback story for:", primaryEmotion);
    }
  }

  // 완전 실패 → failed + refund
  if (scenes.length < 9) {
    await updateSessionStatus(supabaseUrl, serviceKey, sessionId, "failed");
    await refundTicket(supabaseUrl, serviceKey, sessionId);
    return;
  }

  // 장면별 중간 저장 (SSE 표시용)
  for (let i = 0; i < scenes.length; i++) {
    await updateGeneratedStory(
      supabaseUrl,
      serviceKey,
      sessionId,
      scenes.slice(0, i + 1),
    );
  }

  // 동화 제목 생성
  const storyTitle = scenes[0]?.title ?? "나의 딸깍 동화";

  // tq_complete_session RPC (원자적: story 저장 + 티켓 확정 + 상태 완료)
  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/tq_complete_session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_session_id: sessionId,
        p_generated_story: scenes,
        p_story_title: storyTitle,
        p_primary_emotion: primaryEmotion,
        p_secondary_emotion: secondaryEmotion,
        p_emotion_scores: scores,
      }),
    });
  } catch (err) {
    console.error("[TQ-Submit] tq_complete_session RPC failed:", err);
    await updateSessionStatus(supabaseUrl, serviceKey, sessionId, "failed");
    await refundTicket(supabaseUrl, serviceKey, sessionId);
  }
}

/* ═══════════════════════════════════════════════════════
   AI 호출 헬퍼
   ═══════════════════════════════════════════════════════ */

async function callSonnet(
  apiKey: string,
  userMessage: string,
  temperature: number = SONNET_CONFIG.temperature,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: SONNET_CONFIG.model,
    max_tokens: SONNET_CONFIG.maxTokens,
    temperature,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  if (!text) throw new Error("Empty Sonnet response");
  return text;
}

async function callHaikuFallback(
  apiKey: string,
  userMessage: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 6000,
    temperature: 0.7,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  if (!text) throw new Error("Empty Haiku response");
  return text;
}

/* ═══════════════════════════════════════════════════════
   Supabase 서비스 헬퍼 (service role key 직접 사용)
   ═══════════════════════════════════════════════════════ */

async function updateSessionStatus(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
  status: string,
): Promise<void> {
  await fetch(
    `${supabaseUrl}/rest/v1/tq_sessions?id=eq.${sessionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status }),
    },
  );
}

async function updateGeneratedStory(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
  scenes: Array<{ sceneNumber: number; title: string; text: string }>,
): Promise<void> {
  await fetch(
    `${supabaseUrl}/rest/v1/tq_sessions?id=eq.${sessionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ generated_story: scenes }),
    },
  );
}

async function refundTicket(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/tq_refund_ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ p_session_id: sessionId }),
    });
  } catch {
    console.error("[TQ-Submit] Refund failed for session:", sessionId);
  }
}
