/**
 * Narrative Safety — Phase 4 Story Post-generation Guardrails
 *
 * Checks completed fairy tale text for harmful narrative patterns
 * AFTER generation (not during streaming). Uses keyword-based detection
 * only — no additional LLM calls.
 *
 * Detected patterns are NOT shown to the user (2차 상처 방지).
 * Instead, the caller should trigger silent regeneration with
 * strengthened system prompt guidelines.
 *
 * @module narrative-safety
 */

export interface NarrativeViolation {
  pattern: string;
  matched: string;
  severity: "block" | "warn";
}

export interface NarrativeSafetyResult {
  passed: boolean;
  violations: NarrativeViolation[];
}

// ─── 8 Harmful Narrative Patterns ───
// Each pattern: [description, keyword groups (any match = violation)]
// Groups use OR logic within, AND logic between group elements isn't needed
// because single-keyword presence is sufficient signal for review.

interface NarrativePattern {
  id: string;
  description: string;
  /** Korean keywords/phrases — any match triggers */
  keywords: string[];
  severity: "block" | "warn";
}

const HARMFUL_PATTERNS: NarrativePattern[] = [
  {
    id: "child_alone",
    description: "아동이 혼자 위기를 해결 + 성인 도움 부재",
    keywords: [
      "혼자서 해결했",
      "혼자 힘으로 이겨",
      "아무도 도와주지 않았지만",
      "혼자서 싸워",
      "스스로 극복",
      "도움 없이 혼자",
    ],
    severity: "warn",
  },
  {
    id: "parent_absence_justified",
    description: "부모 부재/방치 정당화",
    keywords: [
      "엄마가 없어도 괜찮",
      "부모 없이도 잘",
      "엄마가 떠난 건 당연",
      "아이를 두고 떠나는 것이 맞",
      "혼자 남겨진 것이 오히려",
    ],
    severity: "block",
  },
  {
    id: "self_harm_metaphor",
    description: "자해/자살 은유가 캐릭터에 투영",
    keywords: [
      "사라지고 싶",
      "세상에서 없어지",
      "영원히 잠들",
      "깊은 물 속으로",
      "높은 곳에서 떨어",
      "날개를 접고 추락",
      "스스로를 다치",
      "자신을 해치",
    ],
    severity: "block",
  },
  {
    id: "perpetrator_glorification",
    description: "가해자 미화 / 피해자 비난",
    keywords: [
      "때린 것은 사랑",
      "때리는 건 사랑",
      "맞을 짓을 했",
      "맞아도 싸",
      "혼내는 건 당연",
      "네가 잘못했으니",
      "벌을 받아 마땅",
      "참는 것이 미덕",
    ],
    severity: "block",
  },
  {
    id: "parentification",
    description: "아동에게 성인 역할 부여",
    keywords: [
      "네가 엄마를 돌봐야",
      "네가 가장이",
      "동생을 책임져야",
      "어른 대신",
      "집안을 네가 지켜",
      "네가 강해져야 엄마가",
    ],
    severity: "warn",
  },
  {
    id: "violence_as_solution",
    description: "폭력으로 문제 해결",
    keywords: [
      "주먹으로 해결",
      "때려서 이겼",
      "싸워서 물리쳤",
      "복수로 끝냈",
      "응징했",
      "벌을 내렸",
    ],
    severity: "warn",
  },
  {
    id: "emotion_suppression",
    description: "감정 억제를 미덕으로 표현",
    keywords: [
      "울면 안 돼",
      "울지 마",
      "참는 게 어른",
      "감정을 숨기는 것이 강한",
      "눈물을 보이면 약한",
      "슬픔을 삼키",
      "아픔을 참아야",
    ],
    severity: "warn",
  },
  {
    id: "group_hatred",
    description: "특정 집단 비하/혐오 표현",
    keywords: [
      "못난 사람들",
      "그런 부류",
      "저런 종류의",
      "쓸모없는 존재",
      "태어나지 말았어야",
    ],
    severity: "block",
  },
];

/**
 * Check completed fairy tale text for harmful narrative patterns.
 *
 * IMPORTANT: This should only be called on the FULL completed story text,
 * not during streaming. The caller is responsible for:
 * 1. Silent regeneration on failure (user must NOT see "위험" messages)
 * 2. Logging violations for review
 *
 * @param storyText - Full concatenated story text (all 10 scenes)
 * @returns NarrativeSafetyResult with violations (if any)
 */
export function checkNarrativeSafety(storyText: string): NarrativeSafetyResult {
  const violations: NarrativeViolation[] = [];
  // Normalize: remove extra whitespace for more reliable matching
  const normalized = storyText.replace(/\s+/g, " ");

  for (const pattern of HARMFUL_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword)) {
        violations.push({
          pattern: pattern.id,
          matched: keyword,
          severity: pattern.severity,
        });
        // One match per pattern is enough — skip remaining keywords for this pattern
        break;
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Check if violations contain any "block" level issues.
 * "block" = must regenerate. "warn" = log but allow.
 */
export function hasBlockingViolation(result: NarrativeSafetyResult): boolean {
  return result.violations.some((v) => v.severity === "block");
}
