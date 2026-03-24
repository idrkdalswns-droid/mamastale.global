import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { getSystemPrompt, getPremiumPhase4Supplement, screenForCrisis } from "@/lib/anthropic/system-prompt";
import type { CrisisScreenResult } from "@/lib/anthropic/system-prompt";
import { getPhasePrompt } from "@/lib/anthropic/phase-prompts";
import type { StorySeedContext } from "@/lib/anthropic/phase-prompts";
import { selectModel, getFallbackModel } from "@/lib/anthropic/model-router";
import { validateOutputSafety } from "@/lib/anthropic/output-safety";
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
import { checkRateLimitPersistent, maybeCleanupRateLimits } from "@/lib/utils/rate-limiter";
import { getCachedResponse, setCachedResponse, maybeCleanupCache } from "@/lib/utils/response-cache";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { getClientIP } from "@/lib/utils/validation";
import { stripControlTags } from "@/lib/utils/sanitize-chat";

// ─── Story Seed schema (optional, from client state) ───
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
  ).max(120),  // Generous limit for long conversations
  // R6-F5: Constrain sessionId to prevent log pollution and crisis tracking abuse
  sessionId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  childAge: z.enum(["0-2", "3-5", "6-8", "9-13"]).optional(),
  parentRole: z.enum(["엄마", "아빠", "할머니", "할아버지", "기타"]).optional(),
  parentAge: z.enum(["10s", "20s", "30s", "40s", "50+"]).optional(),
  currentPhase: z.number().min(1).max(4).optional(),
  turnCountInCurrentPhase: z.number().min(0).max(50).optional(),
  storySeed: storySeedSchema,
});

// ─── Rate Limiting (in-memory fallback only — primary is now Supabase) ───
const GUEST_RATE_LIMIT = 10;   // 10 req/min for unauthenticated
const AUTH_RATE_LIMIT = 30;    // 30 req/min for authenticated
// V5-FIX #5: 3→5 to match client FREE_TURN_LIMIT
const GUEST_TURN_LIMIT = 5;   // Server-side guest message limit (must match client FREE_TURN_LIMIT)
const AUTH_TURN_LIMIT = 30;   // Freemium v2: all authenticated users capped at 30 turns per story

// P0-FIX(US-5): Per-request timeout to prevent hung connections
const API_TIMEOUT_MS = 60_000; // 60 seconds max per Anthropic API call

/** Simple retry with exponential backoff for transient errors */
async function callAnthropicWithRetry(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 2
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wrap each attempt with AbortController timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const result = await anthropic.messages.create(
          params,
          { signal: controller.signal }
        );
        return result;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err: unknown) {
      // Treat abort (timeout) as retryable
      const isAbort = err instanceof Error && err.name === "AbortError";
      const errStatus = err instanceof Error && "status" in err
        ? (err as Error & { status: number }).status
        : 0;
      const isRetryable = isAbort || (errStatus === 429 || errStatus === 529 || errStatus >= 500);
      if (!isRetryable || attempt === maxRetries) throw err;
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 8000);
      console.warn(`Anthropic API retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

/** Retry with automatic model fallback */
async function callAnthropicWithFallback(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 2
): Promise<{ response: Anthropic.Message; modelUsed: string; wasFallback: boolean }> {
  try {
    const response = await callAnthropicWithRetry(anthropic, params, maxRetries);
    return { response, modelUsed: params.model, wasFallback: false };
  } catch (err) {
    // Try fallback model
    const fallback = getFallbackModel(params.model);
    if (fallback) {
      console.warn(`[Chat] Model fallback: ${params.model} → ${fallback.model} (${fallback.reasoning})`);
      const fallbackParams = { ...params, model: fallback.model, max_tokens: fallback.maxTokens };
      try {
        const response = await callAnthropicWithRetry(anthropic, fallbackParams, 1);
        return { response, modelUsed: fallback.model, wasFallback: true };
      } catch {
        // Fallback also failed — throw original error
        throw err;
      }
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const ip = getClientIP(request);

  // ─── Auth check (optional — guests allowed with limits) ───
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

      // CTO-FIX(HIGH): Try cookie auth first, then Bearer token fallback.
      let user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const { data: tokenData } = await supabase.auth.getUser(authHeader.slice(7));
          user = tokenData.user;
        }
      }
      userId = user?.id || null;

      // ─── Premium user + ticket detection: check purchase history AND current balance ───
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("metadata, free_stories_remaining")
            .eq("id", userId)
            .single();
          const metadata = (profile?.metadata as Record<string, unknown>) || {};
          const processedOrders = (metadata.processed_orders as string[]) || [];
          isPremiumUser = processedOrders.length > 0;
        } catch {
          // Profile check failed — default to standard tier
        }
      }
    } catch {
      // Auth check failed — treat as guest
    }
  }

  const isAuthenticated = !!userId;
  // R6-F3: Use shared "llm:" prefix so chat + stream share one rate limit pool
  const rateKey = isAuthenticated ? `llm:auth:${userId}` : `llm:ip:${ip}`;
  const rateLimit = isAuthenticated ? AUTH_RATE_LIMIT : GUEST_RATE_LIMIT;

  // ─── Persistent Rate limiting (Supabase primary, in-memory fallback) ───
  const withinLimit = await checkRateLimitPersistent(rateKey, rateLimit, 60);
  if (!withinLimit) {
    logEvent({ eventType: "rate_limit_hit", endpoint: "/api/chat", userId }).catch(() => {});
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  // Periodic cleanup (fire-and-forget)
  maybeCleanupRateLimits().catch(() => {});
  maybeCleanupCache().catch(() => {});

  try {
    // JP-FIX(2): Reject oversized requests before parsing (DoS prevention)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 95_000) { // v1.22.2 Bug Bounty #11: CF Pages 100KB 제한에 맞춤 (95KB 마진)
      return NextResponse.json(
        { error: "요청 데이터가 너무 큽니다." },
        { status: 413 }
      );
    }

    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      // R6-FIX: Log only field paths and error codes — not messages which may contain user input
      console.error("[Chat] Zod validation failed:", parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`).join(", "));
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    const { messages, childAge, parentRole, parentAge, currentPhase: clientPhase, turnCountInCurrentPhase, storySeed } = parsed.data;

    // ─── Server-side turn limit (guests AND authenticated users without tickets) ───
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    if (!isAuthenticated) {
      const totalTurns = Math.ceil(messages.length / 2);
      if (userMsgCount > GUEST_TURN_LIMIT || totalTurns > GUEST_TURN_LIMIT + 1) {
        return NextResponse.json(
          { error: "guest_limit", message: "무료 체험이 끝났어요. 로그인하면 이어서 대화할 수 있어요." },
          { status: 403 }
        );
      }
      // Bug Bounty: Persistent server-side guest turn tracking (parity with /api/chat/stream)
      const guestTurnAllowed = await checkRateLimitPersistent(`guest_turns:${ip}`, GUEST_TURN_LIMIT, 86400);
      if (!guestTurnAllowed) {
        return NextResponse.json(
          { error: "guest_limit", message: "무료 체험이 끝났어요. 로그인하면 이어서 대화할 수 있어요." },
          { status: 403 }
        );
      }
    }
    // Freemium v2: Authenticated users capped at 30 turns per story
    // (generous limit — refresh resets messages array, but context loss deters abuse)
    if (isAuthenticated && userMsgCount > AUTH_TURN_LIMIT) {
      return NextResponse.json(
        { error: "동화를 완성해 주세요. 대화 횟수가 상한에 도달했습니다." },
        { status: 403 }
      );
    }

    // ─── MULTI-TIER CRISIS PRE-SCREENING (v2.0) ───
    const latestUserMsg = messages.filter((m) => m.role === "user").pop();
    let crisisResult: CrisisScreenResult = { severity: null, detectedKeywords: [], response: null };

    if (latestUserMsg) {
      crisisResult = screenForCrisis(latestUserMsg.content);

      // HIGH severity → bypass Claude, return hard-coded response
      if (crisisResult.severity === "HIGH") {
        console.warn("[Chat] HIGH crisis detected (CSSRS", crisisResult.cssrsLevel, "):", crisisResult.detectedKeywords.slice(0, 3).join(", "));
        logLLMCall({
          sessionId: parsed.data.sessionId,
          userId,
          model: "crisis_bypass",
          phase: clientPhase || 1,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - requestStartTime,
          wasCrisisIntercepted: true,
        }).catch(() => {});
        logEvent({
          eventType: "crisis_detection",
          endpoint: "/api/chat",
          userId,
          metadata: {
            severity: "HIGH",
            cssrsLevel: crisisResult.cssrsLevel,
            keywords: crisisResult.detectedKeywords.slice(0, 3),
            reasoning: crisisResult.reasoning,
          },
        }).catch(() => {});
        // Record to crisis_events table for persistent tracking & post-crisis mode
        recordCrisisEvent({
          sessionId: parsed.data.sessionId || `anon_${Date.now()}`,
          userId,
          severity: "HIGH",
          cssrsLevel: crisisResult.cssrsLevel,
          keywords: crisisResult.detectedKeywords.slice(0, 5),
          reasoning: crisisResult.reasoning,
        }).catch(() => {});

        // Slack Crisis Alert (fire-and-forget)
        const slackUrl = process.env.SLACK_CRISIS_WEBHOOK_URL;
        if (slackUrl) {
          fetch(slackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `🚨 HIGH Crisis Detected\nCSSRS Level: ${crisisResult.cssrsLevel}\nKeywords: ${crisisResult.detectedKeywords.slice(0, 3).join(", ")}`,
            }),
          }).catch(() => {});
        }

        return NextResponse.json({
          content: crisisResult.response!,
          phase: clientPhase || 1,
          isStoryComplete: false,
          isCrisisIntervention: true,
        });
      }

      // MEDIUM/LOW severity → log for monitoring with CSSRS detail
      if (crisisResult.severity === "MEDIUM" || crisisResult.severity === "LOW") {
        logEvent({
          eventType: "crisis_detection",
          endpoint: "/api/chat",
          userId,
          metadata: {
            severity: crisisResult.severity,
            cssrsLevel: crisisResult.cssrsLevel,
            keywords: crisisResult.detectedKeywords.slice(0, 3),
            reasoning: crisisResult.reasoning,
          },
        }).catch(() => {});
        // Record MEDIUM events to crisis_events for persistent tracking
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

    // ─── Phase context ───
    const MAX_TURNS_PER_PHASE: Record<number, number> = { 1: 7, 2: 10, 3: 10, 4: 999 };
    const MIN_TURNS_PER_PHASE: Record<number, number> = { 1: 3, 2: 3, 3: 3, 4: 0 };
    const MIN_MSGS_PER_PHASE: Record<number, number> = { 1: 0, 2: 4, 3: 8, 4: 12 };
    // Security: 서버가 메시지 수 기반으로 최대 허용 Phase 결정 (클라이언트 값은 UX 힌트)
    const serverMaxPhase = ([4, 3, 2, 1] as const).find(p => messages.length >= (MIN_MSGS_PER_PHASE[p] || 0)) || 1;
    const rawPhase = clientPhase && clientPhase >= 1 && clientPhase <= 4
      ? Math.min(clientPhase, serverMaxPhase) as 1 | 2 | 3 | 4
      : 1;
    const safePhase = rawPhase;
    const safeTurnCount = turnCountInCurrentPhase ?? 0;

    // ─── POST-CRISIS MODE CHECK (decrement turns if in post-crisis) ───
    if (parsed.data.sessionId && crisisResult.severity === null) {
      decrementPostCrisisTurn(parsed.data.sessionId).catch(() => {});
    }

    // ─── RESPONSE CACHE CHECK (Phase 1 only) ───
    // R2-FIX(C2): Include user context in cache key to prevent cross-user personalization leaks
    // H2-FIX: Hash cache key to strip PII from in-memory storage
    const rawCacheKey = parentRole || childAge
      ? `${latestUserMsg?.content || ""}|role:${parentRole || ""}|age:${childAge || ""}`
      : latestUserMsg?.content || "";
    const cacheKeyBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawCacheKey));
    const cacheKey = Array.from(new Uint8Array(cacheKeyBuf), b => b.toString(16).padStart(2, "0")).join("");
    if (safePhase === 1 && latestUserMsg && crisisResult.severity === null) {
      const cached = await getCachedResponse(cacheKey, safePhase);
      if (cached) {
        logLLMCall({
          sessionId: parsed.data.sessionId,
          userId,
          model: "cache_hit",
          phase: safePhase,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - requestStartTime,
          wasCached: true,
        }).catch(() => {});

        return NextResponse.json({
          content: cached.content,
          phase: cached.phase,
          isStoryComplete: false,
        });
      }
    }

    const anthropic = getAnthropicClient();

    // ─── PHASE-AWARE PROMPT ASSEMBLY (v3.0) ───
    let systemPrompt = getSystemPrompt("ko");

    const VALID_CHILD_AGES = ["0-2", "3-5", "6-8", "9-13"] as const;
    const ageLabels: Record<string, string> = {
      "0-2": "0~2세 (영아)",
      "3-5": "3~5세 (유아)",
      "6-8": "6~8세 (초등 저학년)",
      "9-13": "9~13세 (초등 고학년~중학생)",
    };
    if (childAge && (VALID_CHILD_AGES as readonly string[]).includes(childAge)) {
      systemPrompt += `\n\n<child_age_context>\n사용자의 자녀 연령: ${ageLabels[childAge]}\nPhase 4 동화 작성 시 해당 연령대의 스타일 가이드를 적용하십시오.\n</child_age_context>`;
    }

    // Inject parent role & age context for personalized conversation
    const roleLabels: Record<string, string> = {
      "엄마": "어머니(엄마)",
      "아빠": "아버지(아빠)",
      "할머니": "할머니",
      "할아버지": "할아버지",
      "기타": "보호자",
    };
    const parentAgeLabels: Record<string, string> = {
      "10s": "10대",
      "20s": "20대",
      "30s": "30대",
      "40s": "40대",
      "50+": "50대 이상",
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
      systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 이 Phase에서의 대화 턴: ${safeTurnCount}/${maxTurns} (최소 ${minTurns}턴 필요)\n[중요] 아직 이 단계에서 최소 ${minTurns}턴의 대화가 필요합니다. 절대 다음 Phase로 전환하지 마십시오.\n사용자가 빨리 넘어가고 싶어하더라도, 이 Phase에서 충분한 정보 수집이 되지 않았으므로 부드럽게 대화를 이어가십시오.\n현재 Phase보다 낮은 Phase 번호를 절대 출력하지 마십시오. [PHASE:${safePhase}] 이상만 허용됩니다.\n</phase_context>`;
    } else {
      systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 이 Phase에서의 대화 턴: ${safeTurnCount}/${maxTurns}\n현재 Phase보다 낮은 Phase 번호를 절대 출력하지 마십시오. [PHASE:${safePhase}] 이상만 허용됩니다.\n</phase_context>`;
    }

    // Inject active phase's clinical protocol
    const seedContext: StorySeedContext = {
      coreSeed: storySeed?.coreSeed,
      chosenMetaphor: storySeed?.chosenMetaphor,
      counterForce: storySeed?.counterForce,
      childAge: childAge ? ageLabels[childAge] : undefined,
    };
    systemPrompt += getPhasePrompt(safePhase as 1 | 2 | 3 | 4, seedContext);

    // ─── MEDIUM crisis context injection (defense-in-depth: length cap) ───
    if (crisisResult.severity === "MEDIUM" && crisisResult.promptInjection) {
      systemPrompt += crisisResult.promptInjection.slice(0, 800);
    }

    // ─── INTELLIGENT MODEL ROUTING (litellm-inspired) ───
    const modelSelection = selectModel({
      phase: safePhase as 1 | 2 | 3 | 4,
      isPremiumUser,
      isCrisisContext: crisisResult.severity === "MEDIUM",
    });

    // Append premium story supplement for paid Phase 4
    if (isPremiumUser && safePhase === 4) {
      systemPrompt += getPremiumPhase4Supplement();
    }

    const apiStartTime = Date.now();
    // Sprint 8-A: Prompt Caching — cache the system prompt to reduce costs ~20-30%
    const { response, modelUsed, wasFallback } = await callAnthropicWithFallback(anthropic, {
      model: modelSelection.model,
      max_tokens: modelSelection.maxTokens,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      // F-014 FIX: Strip control tags from user messages to prevent prompt injection
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.role === "user" ? stripControlTags(m.content) : m.content,
      })),
    });

    const apiLatencyMs = Date.now() - apiStartTime;

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const detectedPhase = detectPhase(rawText);
    // V5-FIX #11: Phase null → safePhase (prevent frontend UI breakage)
    // V5-FIX #8: minTurns strip — block premature phase advance when minimum turns not met
    let phase: number;
    if (detectedPhase === null) {
      phase = safePhase;
    } else if (detectedPhase < safePhase) {
      phase = safePhase; // forward-only enforcement
    } else if (detectedPhase > safePhase && safeTurnCount < minTurns) {
      phase = safePhase; // server-side minTurns enforcement
    } else {
      phase = detectedPhase;
    }
    const textNoPhase = stripPhaseTag(rawText);
    // Sprint 2-C: Extract AI-suggested tags before stripping
    const suggestedTags = extractTags(textNoPhase);
    const cleanText = stripTagsTag(textNoPhase);
    const storyComplete = isStoryComplete(cleanText, phase, safePhase);

    // ─── OUTPUT SAFETY VALIDATION (psysafe-ai inspired) ───
    const safetyResult = validateOutputSafety(cleanText, safePhase, detectedPhase);
    // V5-FIX #10: Block medical advice responses (was log-only, now enforced)
    const hasMedicalAdvice = safetyResult.violations.some(v => v.type === "medical_advice");
    const finalContent = hasMedicalAdvice
      ? "저는 의료 전문가가 아니에요. 건강에 관한 걱정이 있으시다면 전문의 상담을 권해드려요. 😊\n\n우리 동화 이야기로 돌아가 볼까요?"
      : cleanText;
    if (!safetyResult.passed) {
      console.warn("[Chat] Output safety violations:", safetyResult.violations.map(v => `${v.type}:${v.matched}`).join(", "));
      logEvent({
        eventType: "output_safety_violation",
        endpoint: "/api/chat",
        userId,
        metadata: {
          violations: safetyResult.violations.map(v => ({ type: v.type, matched: v.matched })),
          phase: safePhase,
          model: modelUsed,
          blocked: hasMedicalAdvice,
        },
      }).catch(() => {});
    }

    // ─── LLM CALL LOGGING (fire-and-forget) ───
    logLLMCall({
      sessionId: parsed.data.sessionId,
      userId,
      model: modelUsed,
      phase: safePhase,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: apiLatencyMs,
      wasModelFallback: wasFallback,
      fallbackReason: wasFallback ? `primary_failed:${modelSelection.model}` : undefined,
    }).catch(() => {});

    // ─── CACHE Phase 1 response (if applicable) ───
    // R2-FIX(C2): Use context-aware cache key to prevent cross-user personalization leaks
    if (safePhase === 1 && !storyComplete && latestUserMsg && crisisResult.severity === null && !hasMedicalAdvice) {
      setCachedResponse(cacheKey, safePhase, finalContent, phase).catch(() => {});
    }

    let storyId: string | undefined;
    let scenes: ReturnType<typeof parseStoryScenes> = [];
    let storyTitle: string | undefined;

    if (storyComplete) {
      // LAUNCH-FIX R2: Only use later assistant messages for scene parsing.
      const assistantMsgs = messages.filter((m) => m.role === "assistant");
      const phase4StartIdx = Math.max(0, assistantMsgs.length - 20);
      const allPhase4Text = assistantMsgs
        .slice(phase4StartIdx)
        .map((m) => m.content)
        .join("\n\n") + "\n\n" + cleanText;

      scenes = parseStoryScenes(allPhase4Text);
      storyTitle = extractStoryTitle(allPhase4Text) || undefined;
      if (scenes.length > 0) {
        storyId = `story_${Date.now()}`;
      }
    }

    return NextResponse.json({
      content: finalContent,
      phase,
      isStoryComplete: storyComplete,
      storyId,
      ...(storyComplete && scenes.length > 0 ? { scenes, title: storyTitle } : {}),
      ...(isPremiumUser && safePhase === 4 ? { isPremium: true } : {}),
      ...(suggestedTags.length > 0 ? { suggestedTags } : {}),
    });
  } catch (error: unknown) {
    // Log error message only (no PII, no full stack)
    console.error("Chat API error:", error instanceof Error ? error.name : "Unknown");

    const latencyMs = Date.now() - requestStartTime;
    logEvent({
      eventType: "error",
      endpoint: "/api/chat",
      latencyMs,
      userId,
      metadata: { errorName: error instanceof Error ? error.name : "Unknown" },
    }).catch(() => {});

    // P2-FIX(DE-2): Specific error messages for different failure modes
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "응답 시간이 초과되었어요. 잠시 후 다시 시도해 주세요." },
        { status: 504 }
      );
    }

    if (error instanceof Error && "status" in error) {
      const status = (error as { status: number }).status;
      if (status === 429) {
        return NextResponse.json(
          { error: "잠시 후 다시 시도해 주세요. (요청이 너무 많습니다)" },
          { status: 429 }
        );
      }
      if (status === 401) {
        // R6-FIX: Return 502 for upstream Anthropic auth failure — not 401 which
        // confuses the client into thinking the *user's* session expired
        return NextResponse.json(
          { error: "AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해 주세요." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
