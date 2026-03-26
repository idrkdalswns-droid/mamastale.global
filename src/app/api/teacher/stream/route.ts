/**
 * Teacher Mode — SSE Streaming Chat API
 *
 * Phase A-E 대화를 SSE로 스트리밍합니다.
 * 턴 카운트 기반 Phase 전환, fire-and-forget DB 저장.
 *
 * SSE Protocol:
 *   data: {"type":"meta","phase":"A","turnCount":0}      → 초기 메타
 *   data: {"type":"text","text":"안녕하세요!"}             → 텍스트 청크
 *   data: {"type":"done","phase":"B","turnCount":5,...}   → 완료 + 메타
 *
 * @module teacher-stream
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { getAnthropicClient } from "@/lib/anthropic/client";
import {
  assembleTeacherSystemPrompt,
  getPhaseFromTurnCount,
  getForceGenerateSystemAddendum,
  resolvePhaseTransition,
} from "@/lib/anthropic/teacher-prompts";
import { sanitizeUserInput } from "@/lib/utils/teacher-sanitize";
import { createStreamTimeout, finalMessageWithTimeout } from "@/lib/anthropic/stream-timeout";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  forceGenerate: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  // 1. Supabase 클라이언트
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  // 2. 인증
  const user = await resolveUser(sb.client, request);
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 3. 레이트 리미팅
  const rateKey = `teacher:auth:${user.id}`;
  const withinLimit = await checkRateLimitPersistent(rateKey, 30, 60);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 4. 요청 파싱
  let body: z.infer<typeof requestSchema>;
  try {
    const raw = await request.json();
    body = requestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const { sessionId, message, forceGenerate } = body;

  // 5. 세션 검증 (소유권 + 만료)
  const { data: session, error: sessionError } = await sb.client
    .from("teacher_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "세션이 만료되었습니다. 코드를 다시 입력해주세요." },
      { status: 401 }
    );
  }

  // 6. Phase 결정 (서버 사이드)
  const turnCount = session.turn_count ?? 0;
  const currentPhase = getPhaseFromTurnCount(turnCount);
  const onboarding = session.onboarding || {};
  // 1.3 FIX: Sanitize onboarding fields (prompt injection defense-in-depth)
  const safeOnboarding = {
    ...onboarding,
    topic: sanitizeUserInput((onboarding as Record<string, unknown>)?.topic as string | undefined, 50),
    situation: sanitizeUserInput((onboarding as Record<string, unknown>)?.situation as string | undefined, 200),
  };

  // 7. 대화 히스토리 로드
  const { data: historyRows } = await sb.client
    .from("teacher_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const history = (historyRows || []).map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // 현재 메시지 추가 (Security: 사용자 입력에서 제어 태그 strip)
  const sanitizedMessage = message
    .replace(/\[GENERATE_READY\]/gi, "")
    .replace(/\[PHASE_READY\]/gi, "");
  history.push({ role: "user" as const, content: sanitizedMessage });

  // 8. 시스템 프롬프트 조립
  let systemPrompt = assembleTeacherSystemPrompt(
    currentPhase,
    safeOnboarding,
    turnCount
  );

  if (forceGenerate) {
    systemPrompt += getForceGenerateSystemAddendum();
  }

  // 9. Anthropic 스트리밍 호출
  const anthropic = getAnthropicClient();
  const encoder = new TextEncoder();

  let fullResponse = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // meta 이벤트
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              phase: currentPhase,
              turnCount,
            })}\n\n`
          )
        );

        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          system: [
            {
              type: "text" as const,
              text: systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ],
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 4096,
        });

        // F-002 FIX: 3-tier streaming timeout (shared utility)
        const timeout = createStreamTimeout(
          (reason) => {
            console.warn(`[Teacher Stream] Timeout: ${reason}`);
            stream.abort();
          },
          { initialMs: 30_000, idleMs: 90_000, absoluteMs: 300_000 }
        );

        try {
          for await (const event of stream) {
            if (request.signal.aborted) break;
            timeout.touch();
            if (!fullResponse) timeout.markFirstChunk();
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                )
              );
            }
          }
        } finally {
          timeout.cleanup();
        }

        // F-002 FIX: finalMessage with 5s timeout
        const finalMessage = await finalMessageWithTimeout(() => stream.finalMessage());
        inputTokens = finalMessage.usage?.input_tokens ?? 0;
        outputTokens = finalMessage.usage?.output_tokens ?? 0;

        // 1.2 FIX: Phase 전환 — resolvePhaseTransition()으로 off-by-one 수정 + 태그 인젝션 방어
        const newTurnCount = turnCount + 1;
        const { newPhase, generateReady } = resolvePhaseTransition(currentPhase, newTurnCount, fullResponse);
        const phaseChanged = newPhase !== currentPhase;

        // ─── DB 저장 (done 이벤트 전에 await — 다음 요청의 히스토리/턴 정합성 보장) ───
        const cleanResponse = fullResponse
          .replace(/\[GENERATE_READY\]/g, "")
          .replace(/\[PHASE_READY\]/g, "")
          .trim();

        const dbOps = Promise.all([
          sb.client.from("teacher_messages").insert({
            session_id: sessionId,
            role: "user",
            content: message,
            phase: currentPhase,
            turn_number: turnCount,  // 3.2 FIX: DB-level dedup via unique index
          }).then(({ error }) => {
            if (error) console.error("[Teacher Stream] Failed to save user message:", error.message);
          }),
          sb.client.from("teacher_messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: cleanResponse,
            phase: currentPhase,
            turn_number: turnCount,  // 3.2 FIX: same turn_number for user+assistant pair
          }).then(({ error }) => {
            if (error) console.error("[Teacher Stream] Failed to save assistant message:", error.message);
          }),
          // BugBounty-FIX: Atomic turn increment with CAS fallback + retry
          (async () => {
            // Try atomic RPC first
            const { error: rpcErr } = await sb.client.rpc("increment_teacher_turn", {
              p_session_id: sessionId,
            });
            if (rpcErr) {
              // RPC not available — CAS fallback: only update if turn_count matches expected
              const prevTurn = newTurnCount - 1;
              const { error, count } = await sb.client.from("teacher_sessions").update({
                turn_count: newTurnCount,
                current_phase: newPhase,
              }).eq("id", sessionId).eq("turn_count", prevTurn);
              if (error || count === 0) {
                // CAS failed — 1 retry with fresh read
                const { data: fresh } = await sb.client.from("teacher_sessions")
                  .select("turn_count").eq("id", sessionId).single();
                if (fresh) {
                  await sb.client.from("teacher_sessions").update({
                    turn_count: fresh.turn_count + 1,
                    current_phase: newPhase,
                  }).eq("id", sessionId).eq("turn_count", fresh.turn_count);
                }
              }
            } else {
              // RPC succeeded for turn_count, update phase separately
              const { error } = await sb.client.from("teacher_sessions").update({
                current_phase: newPhase,
              }).eq("id", sessionId);
              if (error) console.error("[Teacher Stream] Failed to update phase:", error.message);
            }
          })(),
        ]);

        // 5초 타임아웃 — 실패해도 done 이벤트는 반드시 전송
        await Promise.race([dbOps, new Promise(r => setTimeout(r, 5000))]);

        // done 이벤트
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              phase: newPhase,
              turnCount: newTurnCount,
              phaseChanged,
              generateReady,
            })}\n\n`
          )
        );

        controller.close();

        // LLM 로깅
        logLLMCall({
          sessionId,
          userId: user.id,
          model: "claude-sonnet-4-20250514",
          phase: ({ A: 1, B: 2, C: 3, D: 4 }[currentPhase] ?? null) as number | null, // T-B16: map teacher phase string to number
          inputTokens,
          outputTokens,
          latencyMs: Date.now() - requestStartTime,
        }).catch(() => {});

        // Phase 전환 이벤트
        if (phaseChanged) {
          logEvent({
            eventType: "teacher_phase_transition",
            userId: user.id,
            endpoint: "/api/teacher/stream",
            metadata: {
              sessionId,
              from: currentPhase,
              to: newPhase,
              turnCount: newTurnCount,
            },
          }).catch(() => {});
        }
      } catch (err) {
        const isAbort = err instanceof Error && (err.name === "AbortError" || err.message?.includes("aborted"));
        const errorMessage = isAbort
          ? "응답 시간이 초과되었어요. 잠시 후 다시 시도해 주세요."
          : "AI 응답 생성 중 오류가 발생했습니다.";
        console.error("[Teacher Stream] Error:", err instanceof Error ? err.name : "Unknown", isAbort ? "(timeout)" : "");
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          );
        } catch {}
        try { controller.close(); } catch {}
      }
    },
  });

  // F-016 FIX: Add security headers (parity with /api/chat/stream)
  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'none'",
  });
  for (const cookie of sb.getCookieHeaders()) {
    responseHeaders.append("Set-Cookie", cookie);
  }
  return new Response(readable, { headers: responseHeaders });
}
