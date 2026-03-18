/**
 * Phase-Aware Model Router (litellm-inspired)
 *
 * Selects the optimal Claude model based on:
 * - Current phase (1-4)
 * - User tier (standard vs premium)
 * - Crisis context
 *
 * Phase 1 (empathy): Haiku — simple emotional acknowledgment
 * Phase 2 (Socratic): Sonnet — cognitive complexity
 * Phase 3 (metaphor): Sonnet — creative but structured
 * Phase 4 (story): Opus (premium) / Sonnet (standard)
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
      // Phase 1: Empathy/validation — Haiku is sufficient
      return {
        model: MODEL_HAIKU,
        maxTokens: MAX_TOKENS_HAIKU,
        reasoning: "phase1_empathy_haiku",
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
      // Phase 4: Story generation — premium gets Opus
      if (isPremiumUser) {
        return {
          model: MODEL_OPUS,
          maxTokens: MAX_TOKENS_OPUS,
          reasoning: "phase4_premium_opus",
        };
      }
      return {
        model: MODEL_SONNET,
        maxTokens: 8192,  // v1.22.0: 10장면 전체 일괄 출력에 필요
        reasoning: "phase4_standard_sonnet",
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

/** Export model constants for use in other modules */
export const MODELS = {
  HAIKU: MODEL_HAIKU,
  SONNET: MODEL_SONNET,
  OPUS: MODEL_OPUS,
} as const;
