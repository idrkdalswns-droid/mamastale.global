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
import { selectModel } from "@/lib/anthropic/model-router";
import { validateOutputSafety } from "@/lib/anthropic/output-safety";
import {
  detectPhase,
  stripPhaseTag,
  isStoryComplete,
} from "@/lib/anthropic/phase-detection";
import { parseStoryScenes } from "@/lib/utils/story-parser";
import { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { getClientIP } from "@/lib/utils/validation";

const storySeedSchema = z.object({
  coreSeed: z.string().max(200).optional(),
  chosenMetaphor: z.string().max(200).optional(),
  counterForce: z.string().max(200).optional(),
}).optional();

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(50000),
    })
  ).max(120),
  sessionId: z.string().optional(),
  childAge: z.enum(["0-2", "3-5", "6-8"]).optional(),
  currentPhase: z.number().min(1).max(4).optional(),
  turnCountInCurrentPhase: z.number().min(0).optional(),
  storySeed: storySeedSchema,
});

const GUEST_RATE_LIMIT = 10;
const AUTH_RATE_LIMIT = 30;
const GUEST_TURN_LIMIT = 5;

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const ip = getClientIP(request);

  // ─── Auth check (same as /api/chat) ───
  let userId: string | null = null;
  let isPremiumUser = false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      });
      let user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const { data: tokenData } = await supabase.auth.getUser(authHeader.slice(7));
          user = tokenData.user;
        }
      }
      userId = user?.id || null;
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("metadata")
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
  const rateKey = isAuthenticated ? `stream:auth:${userId}` : `stream:ip:${ip}`;
  const rateLimit = isAuthenticated ? AUTH_RATE_LIMIT : GUEST_RATE_LIMIT;

  // ─── Rate limiting ───
  const withinLimit = await checkRateLimitPersistent(rateKey, rateLimit, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
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

  const { messages, childAge, currentPhase: clientPhase, turnCountInCurrentPhase, storySeed } = parsed.data;

  // ─── Guest turn limit ───
  if (!isAuthenticated) {
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    const totalTurns = Math.ceil(messages.length / 2);
    if (userMsgCount > GUEST_TURN_LIMIT || totalTurns > GUEST_TURN_LIMIT + 1) {
      return NextResponse.json({ error: "대화 횟수를 초과했습니다. 티켓을 구매해 주세요." }, { status: 403 });
    }
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
      return NextResponse.json({
        content: crisisResult.response!,
        phase: clientPhase || 1,
        isStoryComplete: false,
        isCrisisIntervention: true,
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
    }
  }

  // ─── Phase context ───
  const MAX_TURNS_PER_PHASE = 10;
  const MIN_MSGS_PER_PHASE: Record<number, number> = { 1: 0, 2: 4, 3: 8, 4: 12 };
  const rawPhase = clientPhase && clientPhase >= 1 && clientPhase <= 4 ? clientPhase : 1;
  const safePhase = messages.length >= (MIN_MSGS_PER_PHASE[rawPhase] || 0) ? rawPhase : Math.max(1, rawPhase - 1) as 1 | 2 | 3 | 4;
  const safeTurnCount = turnCountInCurrentPhase ?? 0;

  // ─── Build system prompt ───
  const ageLabels: Record<string, string> = {
    "0-2": "0~2세 (영아)", "3-5": "3~5세 (유아)", "6-8": "6~8세 (초등 저학년)",
  };
  let systemPrompt = getSystemPrompt("ko");

  if (childAge && ["0-2", "3-5", "6-8"].includes(childAge)) {
    systemPrompt += `\n\n<child_age_context>\n사용자의 자녀 연령: ${ageLabels[childAge]}\nPhase 4 동화 작성 시 해당 연령대의 스타일 가이드를 적용하십시오.\n</child_age_context>`;
  }

  if (safeTurnCount >= MAX_TURNS_PER_PHASE && safePhase < 4) {
    systemPrompt += `\n\n<phase_turn_limit_exceeded>\n[긴급] 현재 Phase ${safePhase}에서 ${safeTurnCount}턴이 경과했습니다. 반드시 Phase ${safePhase + 1}로 전환하십시오.\n</phase_turn_limit_exceeded>`;
  } else {
    systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 턴: ${safeTurnCount}/${MAX_TURNS_PER_PHASE}\n</phase_context>`;
  }

  const seedContext: StorySeedContext = {
    coreSeed: storySeed?.coreSeed,
    chosenMetaphor: storySeed?.chosenMetaphor,
    counterForce: storySeed?.counterForce,
    childAge: childAge ? ageLabels[childAge] : undefined,
  };
  systemPrompt += getPhasePrompt(safePhase as 1 | 2 | 3 | 4, seedContext);

  if (crisisResult.severity === "MEDIUM" && crisisResult.promptInjection) {
    systemPrompt += crisisResult.promptInjection;
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
      try {
        // Send initial metadata
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "meta", phase: safePhase })}\n\n`
        ));

        const stream = anthropic.messages.stream({
          model: modelSelection.model,
          max_tokens: modelSelection.maxTokens,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });

        let fullText = "";

        for await (const event of stream) {
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

        const apiLatencyMs = Date.now() - apiStartTime;
        const finalMessage = await stream.finalMessage();

        // Post-stream processing
        const detectedPhase = detectPhase(fullText);
        const phase = detectedPhase !== null && detectedPhase < safePhase ? safePhase : detectedPhase;
        const cleanText = stripPhaseTag(fullText);
        const storyComplete = isStoryComplete(cleanText, phase, safePhase);

        // Output safety validation
        const safetyResult = validateOutputSafety(cleanText, safePhase, detectedPhase);
        if (!safetyResult.passed) {
          logEvent({
            eventType: "output_safety_violation",
            endpoint: "/api/chat/stream",
            userId,
            metadata: { violations: safetyResult.violations.map(v => ({ type: v.type, matched: v.matched })) },
          }).catch(() => {});
        }

        // Parse scenes if story is complete
        let scenes: ReturnType<typeof parseStoryScenes> = [];
        if (storyComplete) {
          const assistantMsgs = messages.filter((m) => m.role === "assistant");
          const phase4StartIdx = Math.max(0, assistantMsgs.length - 20);
          const allPhase4Text = assistantMsgs.slice(phase4StartIdx).map((m) => m.content).join("\n\n") + "\n\n" + cleanText;
          scenes = parseStoryScenes(allPhase4Text);
        }

        // Send completion event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            phase,
            isStoryComplete: storyComplete,
            ...(storyComplete && scenes.length > 0 ? { scenes, storyId: `story_${Date.now()}` } : {}),
            ...(isPremiumUser && safePhase === 4 ? { isPremium: true } : {}),
            usage: {
              inputTokens: finalMessage.usage.input_tokens,
              outputTokens: finalMessage.usage.output_tokens,
            },
          })}\n\n`
        ));

        controller.close();

        // Fire-and-forget logging
        logLLMCall({
          sessionId: parsed.data.sessionId,
          userId,
          model: modelSelection.model,
          phase: safePhase,
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          latencyMs: apiLatencyMs,
        }).catch(() => {});

      } catch (err) {
        console.error("[Stream] Error:", err instanceof Error ? err.name : "Unknown");
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "error",
            error: "스트리밍 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
          })}\n\n`
        ));
        controller.close();

        logEvent({
          eventType: "error",
          endpoint: "/api/chat/stream",
          userId,
          metadata: { errorName: err instanceof Error ? err.name : "Unknown" },
        }).catch(() => {});
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
