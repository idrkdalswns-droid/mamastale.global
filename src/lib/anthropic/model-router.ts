/**
 * Phase-Aware Model Router (litellm-inspired)
 *
 * Selects the optimal Claude model based on:
 * - Current phase (1-4)
 * - User tier (standard vs premium)
 * - Crisis context
 *
 * Phase 1 (empathy): Sonnet — 첫인상 + 감정 뉘앙스 (퀄리티 투자)
 * Phase 2 (Socratic): Sonnet — cognitive complexity
 * Phase 3 (metaphor): Sonnet — creative but structured
 * Phase 4 (story): Opus (all users) — 최종 산출물 품질 (퀄리티 투자)
 *
 * @module model-router
 */

export interface ModelSelection {
  model: string;
  maxTokens: number;
  reasoning: string;
}

// ─── Model Configuration ───
const MODEL_HAIKU = "claude-haiku-3-5-20241022";
const MODEL_SONNET = "claude-sonnet-4-20250514";
const MODEL_OPUS = "claude-opus-4-20250514";

// Worksheet-specific models (구조화 출력 지원)
const MODEL_HAIKU_45 = "claude-haiku-4-5-20251001";
const MODEL_SONNET_45 = "claude-sonnet-4-5-20250514";

const MAX_TOKENS_HAIKU = 4096;
const MAX_TOKENS_SONNET = 4096;
const MAX_TOKENS_OPUS = 8192;

/**
 * Select the optimal model for the current context.
 */
export function selectModel(params: {
  phase: 1 | 2 | 3 | 4;
  isPremiumUser: boolean;
  /** Whether crisis context was detected (MEDIUM severity) */
  isCrisisContext?: boolean;
}): ModelSelection {
  const { phase, isPremiumUser, isCrisisContext } = params;

  // Crisis context always uses Sonnet (needs nuanced understanding)
  if (isCrisisContext) {
    return {
      model: MODEL_SONNET,
      maxTokens: MAX_TOKENS_SONNET,
      reasoning: "crisis_context_override",
    };
  }

  switch (phase) {
    case 1:
      // Phase 1: Empathy/validation — Sonnet for emotional nuance (첫인상 투자)
      return {
        model: MODEL_SONNET,
        maxTokens: MAX_TOKENS_SONNET,
        reasoning: "phase1_empathy_sonnet",
      };

    case 2:
      // Phase 2: Socratic questioning — needs cognitive complexity
      return {
        model: MODEL_SONNET,
        maxTokens: MAX_TOKENS_SONNET,
        reasoning: "phase2_socratic_sonnet",
      };

    case 3:
      // Phase 3: Metaphor creation — creative but structured
      return {
        model: MODEL_SONNET,
        maxTokens: MAX_TOKENS_SONNET,
        reasoning: "phase3_metaphor_sonnet",
      };

    case 4:
      // Phase 4: Story generation — Opus for all users (최종 산출물 품질 투자)
      // 현재 일반/유료 동일, 추후 분리 가능
      return {
        model: MODEL_OPUS,
        maxTokens: MAX_TOKENS_OPUS,
        reasoning: isPremiumUser ? "phase4_premium_opus" : "phase4_standard_opus",
      };

    default:
      return {
        model: MODEL_SONNET,
        maxTokens: MAX_TOKENS_SONNET,
        reasoning: "default_sonnet",
      };
  }
}

/**
 * Get a fallback model when the primary model fails.
 * Returns null if no fallback is available (already at highest tier).
 *
 * Fallback chain: Haiku → Sonnet → Opus → null
 */
export function getFallbackModel(currentModel: string): ModelSelection | null {
  switch (currentModel) {
    case MODEL_HAIKU:
      return {
        model: MODEL_SONNET,
        maxTokens: MAX_TOKENS_SONNET,
        reasoning: "fallback_haiku_to_sonnet",
      };

    case MODEL_SONNET:
      return {
        model: MODEL_OPUS,
        maxTokens: MAX_TOKENS_OPUS,
        reasoning: "fallback_sonnet_to_opus",
      };

    case MODEL_OPUS:
      // Already at highest tier — no fallback
      return null;

    default:
      return {
        model: MODEL_SONNET,
        maxTokens: MAX_TOKENS_SONNET,
        reasoning: "fallback_unknown_to_sonnet",
      };
  }
}

/**
 * Select the optimal model for worksheet generation.
 * Creative types (what_if, speech_bubble, roleplay_script) use Sonnet 4.5.
 * Standard types use Haiku 4.5 (구조화 출력 지원, 3x cheaper).
 */
export function selectWorksheetModel(activityType: string): ModelSelection {
  const CREATIVE_TYPES = ["what_if", "speech_bubble", "roleplay_script"];
  if (CREATIVE_TYPES.includes(activityType)) {
    return {
      model: MODEL_SONNET,
      maxTokens: 4096,
      reasoning: "worksheet_creative_sonnet",
    };
  }
  return {
    model: MODEL_HAIKU_45,
    maxTokens: 4096,
    reasoning: "worksheet_standard_haiku45",
  };
}

/** Export model constants for use in other modules */
export const MODELS = {
  HAIKU: MODEL_HAIKU,
  SONNET: MODEL_SONNET,
  OPUS: MODEL_OPUS,
  HAIKU_45: MODEL_HAIKU_45,
  SONNET_45: MODEL_SONNET_45,
} as const;
