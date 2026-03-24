/**
 * Shared logic between /api/chat and /api/chat/stream.
 *
 * Extracted to prevent the two endpoints from diverging.
 * Bug Bounty v1.38.0: Phase logic, system prompt assembly, and phase enforcement
 * were inconsistent between chat and stream endpoints.
 *
 * @module chat-shared
 */

import { z } from "zod";
import { getSystemPrompt, getPremiumPhase4Supplement, screenForCrisis } from "@/lib/anthropic/system-prompt";
import type { CrisisScreenResult, SupportedLocale } from "@/lib/anthropic/system-prompt";
import { getPhasePrompt } from "@/lib/anthropic/phase-prompts";
import type { StorySeedContext } from "@/lib/anthropic/phase-prompts";
import {
  detectPhase,
  stripPhaseTag,
  isStoryComplete,
  extractTags,
  stripTagsTag,
} from "@/lib/anthropic/phase-detection";
import { validateOutputSafety } from "@/lib/anthropic/output-safety";
import { stripControlTags } from "@/lib/utils/sanitize-chat";

// ─── Shared Zod schemas ───

export const storySeedSchema = z.object({
  coreSeed: z.string().max(200).optional(),
  chosenMetaphor: z.string().max(200).optional(),
  counterForce: z.string().max(200).optional(),
}).optional();

export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(2000),
    })
  ).max(120),
  sessionId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  childAge: z.enum(["0-2", "3-5", "6-8", "9-13"]).optional(),
  parentRole: z.enum(["엄마", "아빠", "할머니", "할아버지", "기타"]).optional(),
  parentAge: z.enum(["10s", "20s", "30s", "40s", "50+"]).optional(),
  currentPhase: z.number().min(1).max(4).optional(),
  turnCountInCurrentPhase: z.number().min(0).max(50).optional(),
  storySeed: storySeedSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// ─── Shared constants ───

export const GUEST_RATE_LIMIT = 10;
export const AUTH_RATE_LIMIT = 30;
export const GUEST_TURN_LIMIT = 5;
export const AUTH_TURN_LIMIT = 30;

export const MAX_TURNS_PER_PHASE: Record<number, number> = { 1: 7, 2: 10, 3: 10, 4: 999 };
export const MIN_TURNS_PER_PHASE: Record<number, number> = { 1: 3, 2: 3, 3: 3, 4: 0 };
export const MIN_MSGS_PER_PHASE: Record<number, number> = { 1: 0, 2: 4, 3: 8, 4: 12 };

export const AGE_LABELS: Record<string, string> = {
  "0-2": "0~2세 (영아)",
  "3-5": "3~5세 (유아)",
  "6-8": "6~8세 (초등 저학년)",
  "9-13": "9~13세 (초등 고학년~중학생)",
};

const VALID_CHILD_AGES = ["0-2", "3-5", "6-8", "9-13"] as const;

const ROLE_LABELS: Record<string, string> = {
  "엄마": "어머니(엄마)",
  "아빠": "아버지(아빠)",
  "할머니": "할머니",
  "할아버지": "할아버지",
  "기타": "보호자",
};

const PARENT_AGE_LABELS: Record<string, string> = {
  "10s": "10대",
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50+": "50대 이상",
};

// ─── Phase calculation (Bug Bounty: was inconsistent between chat and stream) ───

export interface PhaseContext {
  safePhase: 1 | 2 | 3 | 4;
  safeTurnCount: number;
  minTurns: number;
  maxTurns: number;
}

/**
 * Calculate safe phase from client-provided values + server-side enforcement.
 * Uses the STRICT serverMaxPhase logic (from /api/chat).
 * Bug Bounty 1-5: stream was using a different, more lenient formula.
 */
export function calculateSafePhase(
  messagesLength: number,
  clientPhase: number | undefined,
  turnCountInCurrentPhase: number | undefined,
): PhaseContext {
  // Security: 서버가 메시지 수 기반으로 최대 허용 Phase 결정 (클라이언트 값은 UX 힌트)
  const serverMaxPhase = ([4, 3, 2, 1] as const).find(
    (p) => messagesLength >= (MIN_MSGS_PER_PHASE[p] || 0)
  ) || 1;

  const rawPhase = clientPhase && clientPhase >= 1 && clientPhase <= 4
    ? Math.min(clientPhase, serverMaxPhase) as 1 | 2 | 3 | 4
    : 1;

  const safePhase = rawPhase;
  const safeTurnCount = turnCountInCurrentPhase ?? 0;
  const maxTurns = MAX_TURNS_PER_PHASE[safePhase] ?? 10;
  const minTurns = MIN_TURNS_PER_PHASE[safePhase] ?? 3;

  return { safePhase, safeTurnCount, minTurns, maxTurns };
}

// ─── System prompt assembly ───

export interface SystemPromptParams {
  locale?: SupportedLocale;
  childAge?: string;
  parentRole?: string;
  parentAge?: string;
  safePhase: 1 | 2 | 3 | 4;
  safeTurnCount: number;
  minTurns: number;
  maxTurns: number;
  crisisResult: CrisisScreenResult;
  isPremiumUser: boolean;
  storySeed?: {
    coreSeed?: string;
    chosenMetaphor?: string;
    counterForce?: string;
  };
}

/**
 * Build the complete system prompt with all context injections.
 * Bug Bounty 1-1: crisis promptInjection is now XML-escaped.
 * Bug Bounty 1-7: 800-char cap now preserves closing XML tag.
 */
export function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    locale = "ko",
    childAge,
    parentRole,
    parentAge,
    safePhase,
    safeTurnCount,
    minTurns,
    maxTurns,
    crisisResult,
    isPremiumUser,
    storySeed,
  } = params;

  let systemPrompt = getSystemPrompt(locale);

  // Child age context
  if (childAge && (VALID_CHILD_AGES as readonly string[]).includes(childAge)) {
    systemPrompt += `\n\n<child_age_context>\n사용자의 자녀 연령: ${AGE_LABELS[childAge]}\nPhase 4 동화 작성 시 해당 연령대의 스타일 가이드를 적용하십시오.\n</child_age_context>`;
  }

  // Parent role & age context
  if (parentRole && ROLE_LABELS[parentRole]) {
    let parentContext = `\n\n<parent_context>\n사용자의 역할: ${ROLE_LABELS[parentRole]}`;
    if (parentAge && PARENT_AGE_LABELS[parentAge]) {
      parentContext += `\n사용자의 연령대: ${PARENT_AGE_LABELS[parentAge]}`;
    }
    parentContext += `\n대화 시 "어머니" 대신 적절한 호칭을 사용하십시오. (예: 아버지→"아버지", 할머니→"할머니")`;
    parentContext += `\n</parent_context>`;
    systemPrompt += parentContext;
  }

  // Phase turn context
  if (safeTurnCount >= maxTurns && safePhase < 4) {
    systemPrompt += `\n\n<phase_turn_limit_exceeded>\n[긴급] 현재 Phase ${safePhase}에서 ${safeTurnCount}턴이 경과했습니다. ${maxTurns}턴 제한을 초과했으므로 반드시 Phase ${safePhase + 1}로 전환하십시오.\n이번 응답에서 [PHASE:${safePhase + 1}]을 출력하고, Phase ${safePhase + 1}의 역할로 자연스럽게 전환하십시오.\n</phase_turn_limit_exceeded>`;
  } else if (safeTurnCount < minTurns && safePhase < 4) {
    systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 이 Phase에서의 대화 턴: ${safeTurnCount}/${maxTurns} (최소 ${minTurns}턴 필요)\n[중요] 아직 이 단계에서 최소 ${minTurns}턴의 대화가 필요합니다. 절대 다음 Phase로 전환하지 마십시오.\n사용자가 빨리 넘어가고 싶어하더라도, 이 Phase에서 충분한 정보 수집이 되지 않았으므로 부드럽게 대화를 이어가십시오.\n현재 Phase보다 낮은 Phase 번호를 절대 출력하지 마십시오. [PHASE:${safePhase}] 이상만 허용됩니다.\n</phase_context>`;
  } else {
    systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 이 Phase에서의 대화 턴: ${safeTurnCount}/${maxTurns}\n현재 Phase보다 낮은 Phase 번호를 절대 출력하지 마십시오. [PHASE:${safePhase}] 이상만 허용됩니다.\n</phase_context>`;
  }

  // Phase-specific clinical protocol
  const seedContext: StorySeedContext = {
    coreSeed: storySeed?.coreSeed,
    chosenMetaphor: storySeed?.chosenMetaphor,
    counterForce: storySeed?.counterForce,
    childAge: childAge ? AGE_LABELS[childAge] : undefined,
  };
  systemPrompt += getPhasePrompt(safePhase, seedContext);

  // MEDIUM crisis context injection (Bug Bounty 1-1: now XML-escaped, 1-7: cap preserves closing tag)
  if (crisisResult.severity === "MEDIUM" && crisisResult.promptInjection) {
    let injection = crisisResult.promptInjection;
    if (injection.length > 800) {
      // Preserve closing tag when truncating
      injection = injection.slice(0, 780) + "\n</crisis_context>";
    }
    systemPrompt += injection;
  }

  // Premium story supplement
  if (isPremiumUser && safePhase === 4) {
    systemPrompt += getPremiumPhase4Supplement();
  }

  return systemPrompt;
}

// ─── Phase enforcement (forward-only + minTurns) ───

/**
 * Enforce forward-only phase progression and minimum turn requirements.
 * Bug Bounty 1-5: This was duplicated with subtle differences in chat vs stream.
 */
export function enforcePhase(
  detectedPhase: number | null,
  safePhase: number,
  safeTurnCount: number,
  minTurns: number,
): number {
  if (detectedPhase === null) {
    return safePhase;
  }
  if (detectedPhase < safePhase) {
    return safePhase; // forward-only enforcement
  }
  if (detectedPhase > safePhase && safeTurnCount < minTurns) {
    return safePhase; // server-side minTurns enforcement
  }
  return detectedPhase;
}

// ─── Message preparation (strip control tags) ───

/**
 * Prepare messages for Anthropic API: strip control tags from user messages.
 */
export function prepareMessages(
  messages: { role: string; content: string }[]
): { role: "user" | "assistant"; content: string }[] {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.role === "user" ? stripControlTags(m.content) : m.content,
  }));
}

// ─── Post-processing helpers ───

export interface PostProcessResult {
  phase: number;
  cleanText: string;
  suggestedTags: string[];
  storyComplete: boolean;
}

/**
 * Process Claude's raw response: detect phase, strip tags, check story completion.
 */
export function postProcessResponse(
  rawText: string,
  safePhase: number,
  safeTurnCount: number,
  minTurns: number,
): PostProcessResult {
  const detectedPhase = detectPhase(rawText);
  const phase = enforcePhase(detectedPhase, safePhase, safeTurnCount, minTurns);
  const textNoPhase = stripPhaseTag(rawText);
  const suggestedTags = extractTags(textNoPhase);
  const cleanText = stripTagsTag(textNoPhase);
  const storyComplete = isStoryComplete(cleanText, phase, safePhase);

  return { phase, cleanText, suggestedTags, storyComplete };
}

// Re-export commonly used types and functions for convenience
export { screenForCrisis } from "@/lib/anthropic/system-prompt";
export type { CrisisScreenResult } from "@/lib/anthropic/system-prompt";
export type { StorySeedContext } from "@/lib/anthropic/phase-prompts";
export { selectModel, getFallbackModel } from "@/lib/anthropic/model-router";
export { validateOutputSafety, MEDICAL_REDIRECT_MESSAGE } from "@/lib/anthropic/output-safety";
export { parseStoryScenes, extractStoryTitle } from "@/lib/utils/story-parser";
export { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
export { recordCrisisEvent, decrementPostCrisisTurn } from "@/lib/utils/crisis-tracker";
export { checkRateLimitPersistent, maybeCleanupRateLimits } from "@/lib/utils/rate-limiter";
export { maybeCleanupCache, getCachedResponse, setCachedResponse } from "@/lib/utils/response-cache";
export { getClientIP } from "@/lib/utils/validation";
export { getAnthropicClient } from "@/lib/anthropic/client";
export { stripControlTags } from "@/lib/utils/sanitize-chat";
