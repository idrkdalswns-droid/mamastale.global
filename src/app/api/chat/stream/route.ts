/**
 * SSE Streaming Chat API (Vercel AI SDK inspired)
 *
 * Separate endpoint from /api/chat for backward compatibility.
 * Uses Server-Sent Events to stream Claude's response in real-time.
 *
 * SSE Protocol:
 *   data: {"type":"meta","phase":1}           → Initial metadata
 *   data: {"type":"text","text":"감정이"}      → Streaming text chunk
 *   data: {"type":"done","phase":2,...}        → Completion with metadata
 *
 * @module chat-stream
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { getSystemPrompt, getPremiumPhase4Supplement, screenForCrisis } from "@/lib/anthropic/system-prompt";
import type { CrisisScreenResult } from "@/lib/anthropic/system-prompt";
import { getPhasePrompt } from "@/lib/anthropic/phase-prompts";
import type { StorySeedContext } from "@/lib/anthropic/phase-prompts";
import { selectModel, getFallbackModel } from "@/lib/anthropic/model-router";
import { validateOutputSafety, MEDICAL_REDIRECT_MESSAGE } from "@/lib/anthropic/output-safety";
import {
  detectPhase,
  stripPhaseTag,
  isStoryComplete,
  extractTags,
  stripTagsTag,
} from "@/lib/anthropic/phase-detection";
import { parseStoryScenes, extractStoryTitle } from "@/lib/utils/story-parser";
import { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
import { recordCrisisEvent, decrementPostCrisisTurn } from "@/lib/utils/crisis-tracker";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";
import { stripControlTags } from "@/lib/utils/sanitize-chat";

const storySeedSchema = z.object({
  coreSeed: z.string().max(200).optional(),
  chosenMetaphor: z.string().max(200).optional(),
  counterForce: z.string().max(200).optional(),
}).optional();

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(2000),
    })
  ).max(120),
  // R6-F5: Constrain sessionId to prevent log pollution
  sessionId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  childAge: z.enum(["0-2", "3-5", "6-8", "9-13"]).optional(),
  parentRole: z.enum(["엄마", "아빠", "할머니", "할아버지", "기타"]).optional(),
  parentAge: z.enum(["10s", "20s", "30s", "40s", "50+"]).optional(),
  currentPhase: z.number().min(1).max(4).optional(),
  turnCountInCurrentPhase: z.number().min(0).max(50).optional(),
  storySeed: storySeedSchema,
});

const GUEST_RATE_LIMIT = 10;
const AUTH_RATE_LIMIT = 30;
// V5-FIX #5: 3→5 to match client FREE_TURN_LIMIT
const GUEST_TURN_LIMIT = 5;
const AUTH_TURN_LIMIT = 30;   // Freemium v2: all authenticated users capped at 30 turns per story

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const ip = getClientIP(request);

  // ─── Auth check (same as /api/chat) ───
  let userId: string | null = null;
  let isPremiumUser = false;
  // P1-1: Use createApiSupabaseClient to propagate auth-refresh cookies via getCookieHeaders()
  const sb = createApiSupabaseClient(request);

  if (sb) {
    try {
      let user = (await sb.client.auth.getUser()).data.user;
      if (!user) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
          user = tokenData.user;
        }
      }
      userId = user?.id || null;
      if (userId) {
        try {
          const { data: profile } = await sb.client
            .from("profiles")
            .select("metadata, free_stories_remaining")
            .eq("id", userId)
            .single();
          const metadata = (profile?.metadata as Record<string, unknown>) || {};
          const processedOrders = (metadata.processed_orders as string[]) || [];
          isPremiumUser = processedOrders.length > 0;
        } catch { /* default to standard */ }
      }
    } catch { /* treat as guest */ }
  }

  const isAuthenticated = !!userId;
  // R6-F3: Use shared "llm:" prefix so chat + stream share one rate limit pool
  const rateKey = isAuthenticated ? `llm:auth:${userId}` : `llm:ip:${ip}`;
  const rateLimit = isAuthenticated ? AUTH_RATE_LIMIT : GUEST_RATE_LIMIT;

  // ─── Rate limiting ───
  const withinLimit = await checkRateLimitPersistent(rateKey, rateLimit, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  // ─── Body size check ───
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  // F-009 FIX: Align with /api/chat body size limit (was 1MB, now 95KB)
  if (contentLength > 95_000) {
    return NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
  }

  // ─── Parse request ───
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { messages, childAge, parentRole, parentAge, currentPhase: clientPhase, turnCountInCurrentPhase, storySeed } = parsed.data;

  // ─── Server-side turn limit (guests AND authenticated users without tickets) ───
  const userMsgCount = messages.filter((m) => m.role === "user").length;
  if (!isAuthenticated) {
    // Quick client-side count check (fast rejection)
    const totalTurns = Math.ceil(messages.length / 2);
    if (userMsgCount > GUEST_TURN_LIMIT || totalTurns > GUEST_TURN_LIMIT + 1) {
      return NextResponse.json({ error: "guest_limit", message: "무료 체험이 끝났어요. 로그인하면 이어서 대화할 수 있어요." }, { status: 403 });
    }
    // P1-2: Persistent server-side guest turn tracking (survives browser restart, prevents bypass)
    const guestTurnAllowed = await checkRateLimitPersistent(`guest_turns:${ip}`, GUEST_TURN_LIMIT, 86400);
    if (!guestTurnAllowed) {
      return NextResponse.json({ error: "guest_limit", message: "무료 체험이 끝났어요. 로그인하면 이어서 대화할 수 있어요." }, { status: 403 });
    }
  }
  // Freemium v2: Authenticated users capped at 30 turns per story
  if (isAuthenticated && userMsgCount > AUTH_TURN_LIMIT) {
    return NextResponse.json(
      { error: "동화를 완성해 주세요. 대화 횟수가 상한에 도달했습니다." },
      { status: 403 }
    );
  }

  // ─── Crisis pre-screening ───
  const latestUserMsg = messages.filter((m) => m.role === "user").pop();
  let crisisResult: CrisisScreenResult = { severity: null, detectedKeywords: [], response: null };

  if (latestUserMsg) {
    crisisResult = screenForCrisis(latestUserMsg.content);
    if (crisisResult.severity === "HIGH") {
      // Return crisis response as JSON (not SSE — immediate response)
      console.warn("[Stream] HIGH crisis (CSSRS", crisisResult.cssrsLevel, "):", crisisResult.detectedKeywords.slice(0, 3).join(", "));
      logLLMCall({
        sessionId: parsed.data.sessionId, userId,
        model: "crisis_bypass", phase: clientPhase || 1,
        inputTokens: 0, outputTokens: 0,
        latencyMs: Date.now() - requestStartTime,
        wasCrisisIntercepted: true,
      }).catch(() => {});
      logEvent({
        eventType: "crisis_detection",
        endpoint: "/api/chat/stream",
        userId,
        metadata: {
          severity: "HIGH",
          cssrsLevel: crisisResult.cssrsLevel,
          keywords: crisisResult.detectedKeywords.slice(0, 3),
          reasoning: crisisResult.reasoning,
        },
      }).catch(() => {});
      // P0-FIX: Record HIGH crisis to crisis_events for persistent tracking (was missing in stream endpoint)
      recordCrisisEvent({
        sessionId: parsed.data.sessionId || `anon_${Date.now()}`,
        userId,
        severity: "HIGH",
        cssrsLevel: crisisResult.cssrsLevel,
        keywords: crisisResult.detectedKeywords.slice(0, 5),
        reasoning: crisisResult.reasoning,
      }).catch(() => {});
      // P1-FIX(C5): Return SSE format for HIGH crisis (prevents unnecessary fallback to /api/chat)
      const crisisEncoder = new TextEncoder();
      const crisisStream = new ReadableStream({
        start(controller) {
          controller.enqueue(crisisEncoder.encode(
            `data: ${JSON.stringify({ type: "meta", phase: clientPhase || 1 })}\n\n`
          ));
          controller.enqueue(crisisEncoder.encode(
            `data: ${JSON.stringify({ type: "text", text: crisisResult.response! })}\n\n`
          ));
          controller.enqueue(crisisEncoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              phase: clientPhase || 1,
              isStoryComplete: false,
              isCrisisIntervention: true,
            })}\n\n`
          ));
          controller.close();
        },
      });
      return new Response(crisisStream, {
        headers: {
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
        },
      });
    }
    // MEDIUM/LOW severity → log with CSSRS detail
    if (crisisResult.severity === "MEDIUM" || crisisResult.severity === "LOW") {
      logEvent({
        eventType: "crisis_detection",
        endpoint: "/api/chat/stream",
        userId,
        metadata: {
          severity: crisisResult.severity,
          cssrsLevel: crisisResult.cssrsLevel,
          keywords: crisisResult.detectedKeywords.slice(0, 3),
          reasoning: crisisResult.reasoning,
        },
      }).catch(() => {});
      // P0-FIX: Record MEDIUM crisis events to DB (parity with non-stream endpoint)
      if (crisisResult.severity === "MEDIUM") {
        recordCrisisEvent({
          sessionId: parsed.data.sessionId || `anon_${Date.now()}`,
          userId,
          severity: "MEDIUM",
          cssrsLevel: crisisResult.cssrsLevel,
          keywords: crisisResult.detectedKeywords.slice(0, 5),
          reasoning: crisisResult.reasoning,
        }).catch(() => {});
      }
    }
  }

  // LAUNCH-FIX: Decrement post-crisis turn counter (parity with non-stream endpoint)
  if (parsed.data.sessionId && crisisResult.severity === null) {
    decrementPostCrisisTurn(parsed.data.sessionId).catch(() => {});
  }

  // ─── Phase context ───
  const MAX_TURNS_PER_PHASE: Record<number, number> = { 1: 7, 2: 10, 3: 10, 4: 999 };
  const MIN_TURNS_PER_PHASE: Record<number, number> = { 1: 3, 2: 3, 3: 3, 4: 0 };
  const MIN_MSGS_PER_PHASE: Record<number, number> = { 1: 0, 2: 4, 3: 8, 4: 12 };
  const rawPhase = clientPhase && clientPhase >= 1 && clientPhase <= 4 ? clientPhase : 1;
  const safePhase = messages.length >= (MIN_MSGS_PER_PHASE[rawPhase] || 0) ? rawPhase : Math.max(1, rawPhase - 1) as 1 | 2 | 3 | 4;
  const safeTurnCount = turnCountInCurrentPhase ?? 0;

  // ─── Build system prompt ───
  const ageLabels: Record<string, string> = {
    "0-2": "0~2세 (영아)", "3-5": "3~5세 (유아)", "6-8": "6~8세 (초등 저학년)", "9-13": "9~13세 (초등 고학년~중학생)",
  };
  let systemPrompt = getSystemPrompt("ko");

  if (childAge && ["0-2", "3-5", "6-8", "9-13"].includes(childAge)) {
    systemPrompt += `\n\n<child_age_context>\n사용자의 자녀 연령: ${ageLabels[childAge]}\nPhase 4 동화 작성 시 해당 연령대의 스타일 가이드를 적용하십시오.\n</child_age_context>`;
  }

  // Inject parent role & age context for personalized conversation
  const roleLabels: Record<string, string> = {
    "엄마": "어머니(엄마)", "아빠": "아버지(아빠)", "할머니": "할머니", "할아버지": "할아버지", "기타": "보호자",
  };
  const parentAgeLabels: Record<string, string> = {
    "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대", "50+": "50대 이상",
  };
  if (parentRole && roleLabels[parentRole]) {
    let parentContext = `\n\n<parent_context>\n사용자의 역할: ${roleLabels[parentRole]}`;
    if (parentAge && parentAgeLabels[parentAge]) {
      parentContext += `\n사용자의 연령대: ${parentAgeLabels[parentAge]}`;
    }
    parentContext += `\n대화 시 "어머니" 대신 적절한 호칭을 사용하십시오. (예: 아버지→"아버지", 할머니→"할머니")`;
    parentContext += `\n</parent_context>`;
    systemPrompt += parentContext;
  }

  const maxTurns = MAX_TURNS_PER_PHASE[safePhase] ?? 10;
  const minTurns = MIN_TURNS_PER_PHASE[safePhase] ?? 3;

  if (safeTurnCount >= maxTurns && safePhase < 4) {
    systemPrompt += `\n\n<phase_turn_limit_exceeded>\n[긴급] 현재 Phase ${safePhase}에서 ${safeTurnCount}턴이 경과했습니다. ${maxTurns}턴 제한을 초과했으므로 반드시 Phase ${safePhase + 1}로 전환하십시오.\n이번 응답에서 [PHASE:${safePhase + 1}]을 출력하고, Phase ${safePhase + 1}의 역할로 자연스럽게 전환하십시오.\n</phase_turn_limit_exceeded>`;
  } else if (safeTurnCount < minTurns && safePhase < 4) {
    systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 턴: ${safeTurnCount}/${maxTurns} (최소 ${minTurns}턴 필요)\n[중요] 아직 이 단계에서 최소 ${minTurns}턴의 대화가 필요합니다. 절대 다음 Phase로 전환하지 마십시오.\n사용자가 빨리 넘어가고 싶어하더라도, 이 Phase에서 충분한 정보 수집이 되지 않았으므로 부드럽게 대화를 이어가십시오.\n</phase_context>`;
  } else {
    systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 턴: ${safeTurnCount}/${maxTurns}\n현재 Phase보다 낮은 Phase 번호를 절대 출력하지 마십시오. [PHASE:${safePhase}] 이상만 허용됩니다.\n</phase_context>`;
  }

  const seedContext: StorySeedContext = {
    coreSeed: storySeed?.coreSeed,
    chosenMetaphor: storySeed?.chosenMetaphor,
    counterForce: storySeed?.counterForce,
    childAge: childAge ? ageLabels[childAge] : undefined,
  };
  systemPrompt += getPhasePrompt(safePhase as 1 | 2 | 3 | 4, seedContext);

  // defense-in-depth: length cap on crisis injection
  if (crisisResult.severity === "MEDIUM" && crisisResult.promptInjection) {
    systemPrompt += crisisResult.promptInjection.slice(0, 800);
  }
  if (isPremiumUser && safePhase === 4) {
    systemPrompt += getPremiumPhase4Supplement();
  }

  // ─── Model routing ───
  const modelSelection = selectModel({
    phase: safePhase as 1 | 2 | 3 | 4,
    isPremiumUser,
    isCrisisContext: crisisResult.severity === "MEDIUM",
  });

  // ─── STREAMING RESPONSE ───
  const encoder = new TextEncoder();
  const anthropic = getAnthropicClient();
  const apiStartTime = Date.now();

  const readable = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timeoutCheckRef: ReturnType<typeof setInterval> | null = null;
      try {
        // Send initial metadata
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "meta", phase: safePhase })}\n\n`
        ));

        // R2-FIX(C1): Model fallback for streaming — retry with backup model on failure
        let activeModel = modelSelection.model;
        let activeMaxTokens = modelSelection.maxTokens;
        let wasFallback = false;
        let stream: ReturnType<typeof anthropic.messages.stream>;

        // Sprint 8-A: Prompt Caching for streaming too
        const streamParams = {
          system: [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }],
          // F-014 FIX: Strip control tags from user messages to prevent prompt injection
          messages: messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.role === "user" ? stripControlTags(m.content) : m.content,
          })),
        };

        try {
          stream = anthropic.messages.stream({
            model: activeModel,
            max_tokens: activeMaxTokens,
            ...streamParams,
          });
          // Test the stream by awaiting the first event internally
          // If model is overloaded, the stream constructor or first chunk will throw
        } catch (primaryErr) {
          const fallback = getFallbackModel(activeModel);
          if (fallback) {
            console.warn(`[Stream] Model fallback: ${activeModel} → ${fallback.model}`);
            activeModel = fallback.model;
            activeMaxTokens = fallback.maxTokens;
            wasFallback = true;
            stream = anthropic.messages.stream({
              model: activeModel,
              max_tokens: activeMaxTokens,
              ...streamParams,
            });
          } else {
            throw primaryErr;
          }
        }

        // V5-FIX #12: Faster initial timeout (30s) for first chunk, then 90s idle
        // R8-FIX(C1): Absolute timeout to prevent slow-drip resource exhaustion
        const STREAM_INITIAL_TIMEOUT_MS = 45_000; // 45s for first chunk (Anthropic API 지연 대응)
        const STREAM_TIMEOUT_MS = 90_000; // 90s idle between chunks
        const STREAM_ABSOLUTE_TIMEOUT_MS = 300_000; // 5 minutes absolute max
        const streamStartTime = Date.now();
        let lastChunkTime = Date.now();
        let firstChunkReceived = false;
        const timeoutCheck = setInterval(() => {
          const now = Date.now();
          const idleLimit = firstChunkReceived ? STREAM_TIMEOUT_MS : STREAM_INITIAL_TIMEOUT_MS;
          if (now - lastChunkTime > idleLimit) {
            console.warn(`[Stream] ${firstChunkReceived ? "Idle" : "Initial"} timeout (${idleLimit / 1000}s no data)`);
            clearInterval(timeoutCheck);
            stream.abort();
          } else if (now - streamStartTime > STREAM_ABSOLUTE_TIMEOUT_MS) {
            console.warn("[Stream] Absolute timeout (5min total)");
            clearInterval(timeoutCheck);
            stream.abort();
          }
        }, 5_000);
        timeoutCheckRef = timeoutCheck;

        let fullText = "";
        let streamFailed = false;

        try {
          for await (const event of stream) {
            // V5-FIX #15: Check client disconnect
            if (request.signal.aborted) break;
            lastChunkTime = Date.now();
            if (!firstChunkReceived) firstChunkReceived = true;
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullText += event.delta.text;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
              ));
            }
          }
        } catch (streamErr) {
          // R2-FIX(C1): If primary stream fails mid-stream with no text yet, try fallback
          if (fullText.length === 0 && !wasFallback) {
            const fallback = getFallbackModel(activeModel);
            if (fallback) {
              console.warn(`[Stream] Mid-stream fallback: ${activeModel} → ${fallback.model}`);
              activeModel = fallback.model;
              activeMaxTokens = fallback.maxTokens;
              wasFallback = true;
              clearInterval(timeoutCheck);
              lastChunkTime = Date.now(); // Security: 폴백 시작 시 타임아웃 기준 리셋

              const fallbackStream = anthropic.messages.stream({
                model: activeModel,
                max_tokens: activeMaxTokens,
                ...streamParams,
              });

              // R4-FIX: Fallback stream shares absolute timeout with primary (H-3: prevents 9.5min total)
              const fbStartTime = streamStartTime; // Use primary start time, not Date.now()
              const fbTimeoutCheck = setInterval(() => {
                const now = Date.now();
                if (now - lastChunkTime > STREAM_TIMEOUT_MS) {
                  console.warn("[Stream] Fallback idle timeout");
                  clearInterval(fbTimeoutCheck);
                  fallbackStream.abort();
                } else if (now - fbStartTime > STREAM_ABSOLUTE_TIMEOUT_MS) {
                  console.warn("[Stream] Fallback absolute timeout (5min)");
                  clearInterval(fbTimeoutCheck);
                  fallbackStream.abort();
                }
              }, 5_000);

              try {
                for await (const event of fallbackStream) {
                  // V5-FIX #15: Check client disconnect in fallback loop too
                  if (request.signal.aborted) break;
                  lastChunkTime = Date.now();
                  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                    fullText += event.delta.text;
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                    ));
                  }
                }
              } finally {
                clearInterval(fbTimeoutCheck);
              }
              // Replace stream reference for finalMessage
              stream = fallbackStream;
            } else {
              streamFailed = true;
              throw streamErr;
            }
          } else {
            streamFailed = true;
            throw streamErr;
          }
        } finally {
          // R4-FIX(A1): Always clear interval — previously guarded by !streamFailed,
          // causing interval leak when stream fails without fallback
          clearInterval(timeoutCheck);
        }

        const apiLatencyMs = Date.now() - apiStartTime;
        // V5-FIX #13: Wrap finalMessage() in 5s timeout to prevent hang
        let finalMessage: Awaited<ReturnType<typeof stream.finalMessage>>;
        try {
          finalMessage = await Promise.race([
            stream.finalMessage(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("finalMessage timeout")), 5_000)),
          ]);
        } catch {
          // Timeout or error — construct minimal usage data
          finalMessage = { usage: { input_tokens: 0, output_tokens: 0 } } as Awaited<ReturnType<typeof stream.finalMessage>>;
        }

        // Post-stream processing
        const detectedPhase = detectPhase(fullText);
        // V5-FIX #11: Phase null → safePhase; #8: minTurns strip
        let phase: number;
        if (detectedPhase === null) {
          phase = safePhase;
        } else if (detectedPhase < safePhase) {
          phase = safePhase;
        } else if (detectedPhase > safePhase && safeTurnCount < minTurns) {
          phase = safePhase;
        } else {
          phase = detectedPhase;
        }
        const textNoPhase = stripPhaseTag(fullText);
        // Sprint 2-C: Extract AI-suggested tags before stripping
        const suggestedTags = extractTags(textNoPhase);
        const cleanText = stripTagsTag(textNoPhase);
        const storyComplete = isStoryComplete(cleanText, phase, safePhase);

        // Output safety validation
        const safetyResult = validateOutputSafety(cleanText, safePhase, detectedPhase);
        const hasMedicalRedirect = safetyResult.violations.some(v => v.type === "medical_advice" && v.severity === "redirect");
        if (!safetyResult.passed) {
          logEvent({
            eventType: "output_safety_violation",
            endpoint: "/api/chat/stream",
            userId,
            metadata: { violations: safetyResult.violations.map(v => ({ type: v.type, matched: v.matched })), redirected: hasMedicalRedirect },
          }).catch(() => {});
        }
        // P1-4: Send safety_redirect SSE event (appends warm message, does NOT block original)
        if (hasMedicalRedirect) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "safety_redirect", message: MEDICAL_REDIRECT_MESSAGE })}\n\n`
          ));
        }

        // Parse scenes if story is complete
        let scenes: ReturnType<typeof parseStoryScenes> = [];
        let storyTitle: string | undefined;
        if (storyComplete) {
          const assistantMsgs = messages.filter((m) => m.role === "assistant");
          const phase4StartIdx = Math.max(0, assistantMsgs.length - 20);
          const allPhase4Text = assistantMsgs.slice(phase4StartIdx).map((m) => m.content).join("\n\n") + "\n\n" + cleanText;
          scenes = parseStoryScenes(allPhase4Text);
          storyTitle = extractStoryTitle(allPhase4Text) || undefined;
        }

        // Send completion event
        // P1-4: Include medicalRedirected flag for client-side warm redirect
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            phase,
            isStoryComplete: storyComplete,
            ...(hasMedicalRedirect ? { medicalRedirected: true } : {}),
            ...(storyComplete && scenes.length > 0 ? { scenes, storyId: `story_${Date.now()}`, title: storyTitle } : {}),
            ...(isPremiumUser && safePhase === 4 ? { isPremium: true } : {}),
            ...(suggestedTags.length > 0 ? { suggestedTags } : {}),
            usage: {
              inputTokens: finalMessage.usage.input_tokens,
              outputTokens: finalMessage.usage.output_tokens,
            },
          })}\n\n`
        ));

        // V5-FIX #14: Atomic close with try-catch to prevent double-close crash
        if (!closed) { closed = true; clearInterval(timeoutCheck); try { controller.close(); } catch {} }

        // Fire-and-forget logging
        logLLMCall({
          sessionId: parsed.data.sessionId,
          userId,
          model: activeModel,
          phase: safePhase,
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          latencyMs: apiLatencyMs,
          wasModelFallback: wasFallback,
          fallbackReason: wasFallback ? `primary_failed:${modelSelection.model}` : undefined,
        }).catch(() => {});

      } catch (err) {
        // R2-FIX: Distinguish timeout errors from other stream failures
        const isAbort = err instanceof Error && (err.name === "AbortError" || err.message?.includes("aborted"));
        const errorMessage = isAbort
          ? "응답 시간이 초과되었어요. 잠시 후 다시 시도해 주세요."
          : "스트리밍 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
        console.error("[Stream] Error:", err instanceof Error ? err.name : "Unknown", isAbort ? "(timeout)" : "");
        // V5-FIX #14: Atomic close in error handler
        if (!closed) {
          if (timeoutCheckRef) clearInterval(timeoutCheckRef);
          try {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: errorMessage,
              })}\n\n`
            ));
          } catch {}
          closed = true;
          try { controller.close(); } catch {}
        }

        logEvent({
          eventType: "error",
          endpoint: "/api/chat/stream",
          userId,
          metadata: { errorName: err instanceof Error ? err.name : "Unknown", isTimeout: isAbort },
        }).catch(() => {});
      }
    },
  });

  // R6-F6: Add security headers to raw Response (middleware headers bypass)
  // P1-1: Propagate auth-refresh cookies via raw Set-Cookie headers (applyCookies() crashes on raw Response)
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
  if (sb) {
    for (const cookie of sb.getCookieHeaders()) {
      responseHeaders.append("Set-Cookie", cookie);
    }
  }
  return new Response(readable, { headers: responseHeaders });
}
