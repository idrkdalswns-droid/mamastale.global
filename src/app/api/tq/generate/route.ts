/**
 * GET /api/tq/generate — 딸깍 동화 AI 생성 + SSE 스트리밍
 *
 * submit(202) 후 클라이언트가 SSE 연결 → 이 라우트에서:
 * 1. generated_story가 비어있으면 → AI 생성 시작 (4-tier 폴백)
 * 2. 장면별로 DB 저장 + SSE 전송
 * 3. 완료 시 tq_complete_session RPC 호출
 * 4. 재접속 시 기존 장면 먼저 전송 후 나머지 생성
 *
 * 인앱 브라우저 → JSON 폴링 모드 자동 전환
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { calculatePhaseScores, classifyEmotionProfile } from "@/lib/tq/tq-emotion-scoring";
import type { ResponseItem } from "@/lib/tq/tq-emotion-scoring";
import {
  SONNET_CONFIG,
  ORCHESTRATOR_SYSTEM_PROMPT,
  buildOrchestratorUserMessage,
  parseTQScenes,
} from "@/lib/tq/tq-orchestrator";
import type { TQScene } from "@/lib/tq/tq-orchestrator";
import { getFallbackStory } from "@/lib/tq/tq-fallback-stories";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:generate", { maxEntries: 100 });

// 인앱 브라우저 패턴
const IN_APP_PATTERNS = [
  /KAKAOTALK/i,
  /NAVER/i,
  /Line/i,
  /Instagram/i,
  /FBAN|FBAV/i,
  /Twitter/i,
];

function isInAppBrowser(ua: string): boolean {
  return IN_APP_PATTERNS.some((p) => p.test(ua));
}

const AI_TIMEOUT_MS = 120_000; // 120s per AI call

export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return new Response(
      JSON.stringify({ error: t("Errors.system.configError") }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  const user = await resolveUser(sb.client, request, "TQ-Generate");
  if (!user)
    return new Response(
      JSON.stringify({ error: t("Errors.auth.loginRequired") }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );

  if (!limiter.check(user.id, 3, 60_000))
    return new Response(
      JSON.stringify({ error: t("Errors.rateLimit.tooManyRequestsShort") }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
    );

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId)
    return new Response(
      JSON.stringify({ error: t("Errors.validation.sessionIdFieldRequired") }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

  // UUID 형식 검증
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))
    return new Response(
      JSON.stringify({ error: t("Errors.validation.invalidSessionId") }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

  // 세션 확인
  const { data: session } = await sb.client
    .from("tq_sessions")
    .select("id, user_id, status, generated_story, primary_emotion, secondary_emotion, emotion_scores, responses, q20_text, crisis_severity")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session)
    return new Response(
      JSON.stringify({ error: t("Errors.teacher.sessionNotFound") }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );

  // 이미 완료된 세션 → 결과 반환
  if (session.status === "completed") {
    const scenes = Array.isArray(session.generated_story) ? session.generated_story : [];
    return new Response(
      JSON.stringify({ scenes, status: "completed", primary_emotion: session.primary_emotion }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // generating이 아니면 에러
  if (session.status !== "generating")
    return new Response(
      JSON.stringify({ error: t("Errors.teacher.cannotSubmitInCurrentState") }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );

  // 인앱 브라우저 → JSON 폴링 모드
  const ua = request.headers.get("user-agent") ?? "";
  const polling = isInAppBrowser(ua) || request.nextUrl.searchParams.get("polling") === "true";

  if (polling) {
    const scenes = Array.isArray(session.generated_story) ? session.generated_story : [];
    return new Response(
      JSON.stringify({
        scenes,
        status: session.status,
        primary_emotion: session.primary_emotion,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // SSE 스트리밍 + AI 생성
  const cookieHeaders = sb.getCookieHeaders();
  const encoder = new TextEncoder();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          const eventType = (data.type as string) || "message";
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Controller closed (client disconnected)
        }
      };

      // 메타 이벤트
      send({ type: "meta", sessionId, source: "tq" });

      // 환경변수 체크
      if (!serviceKey || !supabaseUrl || !apiKey) {
        send({ type: "error", message: t("Errors.story.createFailed") });
        await updateSessionStatus(supabaseUrl!, serviceKey!, sessionId, "failed");
        controller.close();
        return;
      }

      const existingScenes: TQScene[] = Array.isArray(session.generated_story)
        ? session.generated_story
        : [];

      // 재접속: 기존 장면 먼저 전송
      for (let i = 0; i < existingScenes.length; i++) {
        const scene = existingScenes[i];
        send({ type: "scene", sceneNumber: scene.sceneNumber, title: scene.title, text: scene.text, index: i });
        send({ type: "progress", current: scene.sceneNumber, total: 9 });
      }

      // 이미 9장면 이상 있으면 → 완료 처리만
      if (existingScenes.length >= 9) {
        // RPC가 아직 안 됐을 수 있으므로 완료 처리
        const storyId = await completeSession(
          supabaseUrl, serviceKey, sessionId, existingScenes,
          session.primary_emotion, session.secondary_emotion, session.emotion_scores,
        );
        if (storyId) {
          send({ type: "done", story_id: storyId, scenes: existingScenes.length, primaryEmotion: session.primary_emotion });
        } else {
          // RPC 실패 → story가 이미 존재하는지 확인 (이중 환불 방지)
          const existingStoryId = await getStoryIdForSession(supabaseUrl!, serviceKey!, sessionId);
          if (existingStoryId) {
            send({ type: "done", story_id: existingStoryId, scenes: existingScenes.length, primaryEmotion: session.primary_emotion });
          } else {
            send({ type: "error", message: t("Errors.story.createFailed") });
            await updateSessionStatus(supabaseUrl, serviceKey, sessionId, "failed");
            await refundTicket(supabaseUrl, serviceKey, sessionId);
          }
        }
        controller.close();
        return;
      }

      // AI 생성 ���요
      const responses: ResponseItem[] = Array.isArray(session.responses)
        ? session.responses
        : [];
      const scores = session.emotion_scores ?? calculatePhaseScores(responses);
      const primaryEmotion = session.primary_emotion ?? classifyEmotionProfile(scores).primary;
      const secondaryEmotion = session.secondary_emotion ?? classifyEmotionProfile(scores).secondary;

      const allResponses = responses.map((r) => ({
        questionId: r.question_id,
        choiceText: "",
        phase: r.phase,
      }));

      const userMessage = buildOrchestratorUserMessage({
        scores,
        primaryEmotion: primaryEmotion as Parameters<typeof buildOrchestratorUserMessage>[0]["primaryEmotion"],
        secondaryEmotion: (secondaryEmotion ?? null) as Parameters<typeof buildOrchestratorUserMessage>[0]["secondaryEmotion"],
        allResponses,
        q20Text: session.q20_text ?? null,
        crisisSeverity: (session.crisis_severity ?? "NONE") as "NONE" | "LOW" | "MEDIUM",
      });

      // 4-tier 폴백
      let storyText: string | null = null;

      // Tier 1: Sonnet
      try {
        send({ type: "progress", current: 0, total: 9 });
        storyText = await callSonnet(apiKey, userMessage);
      } catch (err) {
        console.warn("[TQ-Generate] Sonnet tier 1 failed:", err instanceof Error ? err.message : err);
      }

      // Tier 2: Sonnet retry (lower temperature)
      if (!storyText) {
        try {
          storyText = await callSonnet(apiKey, userMessage, 0.75);
        } catch (err) {
          console.warn("[TQ-Generate] Sonnet tier 2 failed:", err instanceof Error ? err.message : err);
        }
      }

      // Tier 3: Haiku downgrade
      if (!storyText) {
        try {
          storyText = await callHaikuFallback(apiKey, userMessage);
        } catch (err) {
          console.warn("[TQ-Generate] Haiku tier 3 failed:", err instanceof Error ? err.message : err);
        }
      }

      // 장면 파싱
      let scenes: TQScene[] = storyText ? parseTQScenes(storyText) : [];

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
          console.warn("[TQ-Generate] Using pre-generated fallback story for:", primaryEmotion);
        }
      }

      // 완전 실패 → failed + refund
      if (scenes.length < 9) {
        send({ type: "error", message: t("Errors.story.createFailed") });
        await updateSessionStatus(supabaseUrl, serviceKey, sessionId, "failed");
        await refundTicket(supabaseUrl, serviceKey, sessionId);
        controller.close();
        return;
      }

      // 장면별 DB 저장 + SSE 전송
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        await updateGeneratedStory(supabaseUrl, serviceKey, sessionId, scenes.slice(0, i + 1));
        send({ type: "scene", sceneNumber: scene.sceneNumber, title: scene.title, text: scene.text, index: i });
        send({ type: "progress", current: scene.sceneNumber, total: 9 });
      }

      // tq_complete_session RPC (원자적: story 저장 + 티켓 확정 + 상태 완료)
      const storyId = await completeSession(
        supabaseUrl, serviceKey, sessionId, scenes,
        primaryEmotion, secondaryEmotion, scores,
      );

      if (storyId) {
        send({ type: "done", story_id: storyId, scenes: scenes.length, primaryEmotion });
      } else {
        console.error("[TQ-Generate] tq_complete_session RPC failed");
        send({ type: "error", message: t("Errors.story.createFailed") });
        await updateSessionStatus(supabaseUrl, serviceKey, sessionId, "failed");
        await refundTicket(supabaseUrl, serviceKey, sessionId);
      }

      controller.close();
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
  };

  for (const cookie of cookieHeaders) {
    headers["Set-Cookie"] = cookie;
  }

  return new Response(stream, { headers });
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await anthropic.messages.create(
      {
        model: SONNET_CONFIG.model,
        max_tokens: SONNET_CONFIG.maxTokens,
        temperature,
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: controller.signal },
    );
    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!text) throw new Error("Empty Sonnet response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callHaikuFallback(
  apiKey: string,
  userMessage: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        temperature: 0.7,
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: controller.signal },
    );
    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!text) throw new Error("Empty Haiku response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/* ═══════════════════════════════════════════════════════
   Supabase 서비스 헬퍼 (service role key 직접 사용)
   모든 fetch에 .ok 체크 포함 (C3+C4)
   ═══════════════════════════════════════════════════════ */

async function completeSession(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
  scenes: TQScene[],
  primaryEmotion: string,
  secondaryEmotion: string | null,
  scores: Record<string, number>,
): Promise<string | null> {
  const storyTitle = scenes[0]?.title ?? "나의 딸깍 동화";
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/tq_complete_session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[TQ-Generate] RPC tq_complete_session HTTP error:", res.status, errBody);
      return null;
    }
    const storyId = await res.json();
    return typeof storyId === "string" ? storyId : null;
  } catch (err) {
    console.error("[TQ-Generate] RPC tq_complete_session network error:", err);
    return null;
  }
}

async function updateSessionStatus(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
  status: string,
): Promise<boolean> {
  try {
    const res = await fetch(
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
    if (!res.ok) {
      console.error("[TQ-Generate] updateSessionStatus failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[TQ-Generate] updateSessionStatus error:", err);
    return false;
  }
}

async function updateGeneratedStory(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
  scenes: TQScene[],
): Promise<boolean> {
  try {
    const res = await fetch(
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
    if (!res.ok) {
      console.error("[TQ-Generate] updateGeneratedStory failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[TQ-Generate] updateGeneratedStory error:", err);
    return false;
  }
}

async function getStoryIdForSession(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/tq_sessions?id=eq.${sessionId}&select=story_id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const storyId = rows?.[0]?.story_id;
    return typeof storyId === "string" ? storyId : null;
  } catch {
    return null;
  }
}

async function refundTicket(
  supabaseUrl: string,
  serviceKey: string,
  sessionId: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/tq_refund_ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ p_session_id: sessionId }),
    });
    if (!res.ok) {
      console.error("[TQ-Generate] refundTicket failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[TQ-Generate] refundTicket error:", err);
    return false;
  }
}
