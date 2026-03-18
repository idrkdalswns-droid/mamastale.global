/**
 * Output Safety Validation (psysafe-ai inspired)
 *
 * Post-generation guardrails that check Claude's response
 * BEFORE sending to the user. Catches:
 * - Toxic positivity phrases
 * - Medical advice without proper context
 * - Phase inconsistency
 *
 * @module output-safety
 */

export interface SafetyViolation {
  type:
    | "toxic_positivity"
    | "medical_advice"
    | "phase_inconsistency";
  matched: string;
  severity: "block" | "warn" | "redirect";
}

/** Warm redirect message for medical advice — guides to professional help without blocking */
export const MEDICAL_REDIRECT_MESSAGE =
  "이 부분은 전문 상담사와 함께하시면 좋겠어요. 정신건강 위기상담 전화 1393, 자살예방 상담 1577-0199로 연락하실 수 있어요.";

export interface SafetyCheckResult {
  passed: boolean;
  violations: SafetyViolation[];
  filteredContent?: string;
}

// ─── Toxic positivity patterns (already forbidden in system prompt but Claude might still generate) ───
const TOXIC_POSITIVITY_KO: string[] = [
  "괜찮아질 거예요",
  "괜찮아질 거에요",
  "다 잘 될 거예요",
  "다 잘될 거예요",
  "시간이 약이에요",
  "시간이 약입니다",
  "시간이 지나면 나아질",
  "힘내세요",
  "힘내요",
  "당신은 강해요",
  "당신이 강해요",
  "엄마는 강해요",
  "많은 사람들이 그래요",
  "많은 분들이 그래요",
  "누구나 다 그래요",
  "누구나 겪는 일이에요",
  "그건 당신의 탓이 아니에요",
  "긍정적으로 생각하세요",
  "긍정적으로 생각해 보세요",
];

const TOXIC_POSITIVITY_EN: string[] = [
  "everything will be okay",
  "everything will be fine",
  "time heals all wounds",
  "stay strong",
  "be strong",
  "you are strong",
  "everyone goes through this",
  "it's not your fault",
  "think positive",
  "look on the bright side",
  "just be happy",
  "cheer up",
];

// ─── Medical advice patterns (only flagged outside crisis context) ───
const MEDICAL_ADVICE_KO: string[] = [
  "약을 드세요",
  "약을 복용하세요",
  "약을 먹으세요",
  "처방전을 받으세요",
  "진단을 받으세요",
  "병원에 가세요",
  "정신과에 가세요",
  "상담사를 만나세요",
];

// These are ALLOWED in crisis context (when referring to professional help)
const MEDICAL_ADVICE_CRISIS_EXCEPTIONS: string[] = [
  "전문가",
  "전문 상담",
  "1393",
  "1577",
  "119",
  "위기",
  "도움을 받",
];

/**
 * Validate Claude's output for safety violations.
 *
 * @param content - The cleaned (phase-tag-stripped) response text
 * @param expectedPhase - The phase the client expects
 * @param detectedPhase - The phase detected from Claude's output (null if not found)
 * @returns SafetyCheckResult with violations array and optionally filtered content
 */
export function validateOutputSafety(
  content: string,
  expectedPhase: number,
  detectedPhase: number | null
): SafetyCheckResult {
  const violations: SafetyViolation[] = [];
  const lowerContent = content.toLowerCase();

  // ─── 1. Toxic positivity detection ───
  for (const phrase of TOXIC_POSITIVITY_KO) {
    if (content.includes(phrase)) {
      violations.push({
        type: "toxic_positivity",
        matched: phrase,
        severity: "warn", // Log but don't block — Claude was instructed not to, but might occasionally
      });
    }
  }
  for (const phrase of TOXIC_POSITIVITY_EN) {
    if (lowerContent.includes(phrase)) {
      violations.push({
        type: "toxic_positivity",
        matched: phrase,
        severity: "warn",
      });
    }
  }

  // ─── 2. Medical advice detection (only outside crisis context) ───
  // v1.22.2 Bug Bounty #10: 공백/특수문자 정규화 후 매칭 (우회 방지)
  const normalizedContent = content.replace(/[\s\-…·.,:;!?()]/g, "");
  const isCrisisContext = MEDICAL_ADVICE_CRISIS_EXCEPTIONS.some(
    (kw) => content.includes(kw)
  );
  if (!isCrisisContext) {
    for (const phrase of MEDICAL_ADVICE_KO) {
      const normalizedPhrase = phrase.replace(/[\s\-…·.,:;!?()]/g, "");
      if (normalizedContent.includes(normalizedPhrase)) {
        violations.push({
          type: "medical_advice",
          matched: phrase,
          severity: "redirect",
        });
      }
    }
  }

  // ─── 3. Phase consistency check ───
  if (
    detectedPhase !== null &&
    expectedPhase > 0 &&
    detectedPhase < expectedPhase
  ) {
    violations.push({
      type: "phase_inconsistency",
      matched: `expected>=${expectedPhase}, detected=${detectedPhase}`,
      severity: "warn",
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    // Currently all violations are "warn" (log-only), no content filtering.
    // If block-level violations are added later, filteredContent would be used.
  };
}
