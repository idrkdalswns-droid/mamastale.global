/**
 * Detect phase tag [PHASE:N] from AI response
 * Handles variations: [PHASE:1], [PHASE: 1], [Phase:1], [phase: 1], [PHASE 1], etc.
 */
export function detectPhase(text: string): number | null {
  const match = text.match(/\[(?:PHASE|Phase|phase)[:\s]*(\d)\]/i);
  if (!match) return null;
  // R6-3: Clamp to valid phases 1-4 (reject 0, 5-9 hallucinations)
  const n = parseInt(match[1]);
  return n >= 1 && n <= 4 ? n : null;
}

/**
 * Strip all phase tag variations from response text
 * Catches: [PHASE:1], [PHASE: 1], [Phase:1], [phase 1], standalone "PHASE 1" lines, etc.
 */
export function stripPhaseTag(text: string): string {
  return text
    // [PHASE:N] with any casing, optional space around colon
    .replace(/\[(?:PHASE|Phase|phase)\s*[:：]\s*\d\]\s*/gi, "")
    // [PHASE N] without colon
    .replace(/\[(?:PHASE|Phase|phase)\s+\d\]\s*/gi, "")
    // Standalone "PHASE N" or "Phase N" on its own line
    .replace(/^(?:PHASE|Phase)\s*[:：]?\s*\d\s*$/gm, "")
    // Any remaining [PHASE...] patterns
    .replace(/\[PHASE[^\]]*\]\s*/gi, "")
    .trim();
}

/**
 * Sprint 2-C: Extract AI-suggested tags from [TAGS: 자존감, 성장, 감정표현] pattern.
 * Returns validated tags (only those in VALID_TOPICS), max 3.
 */
const VALID_TAGS = ["자존감", "성장", "감정표현", "분노조절", "우울극복", "용기", "친구관계", "가족사랑"];

export function extractTags(text: string): string[] {
  const match = text.match(/\[TAGS?:\s*([^\]]+)\]/i);
  if (!match) return [];
  return match[1]
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter((t) => VALID_TAGS.includes(t))
    .slice(0, 3);
}

/**
 * Sprint 2-C: Strip [TAGS: ...] from response text so it doesn't appear in story.
 */
export function stripTagsTag(text: string): string {
  return text.replace(/\[TAGS?:\s*[^\]]*\]\s*/gi, "").trim();
}

/**
 * Check if story is complete (Phase 4 with WISDOM scenes).
 * @param text - The cleaned AI response text
 * @param phase - Detected phase from AI response (may be null if tag missing)
 * @param clientPhase - Current phase from client state (fallback when AI omits tag)
 */
export function isStoryComplete(text: string, phase: number | null, clientPhase?: number): boolean {
  // Use detected phase, falling back to client-reported phase
  const effectivePhase = phase ?? clientPhase ?? 0;
  if (effectivePhase !== 4) return false;

  // Check for story completion markers (English, Korean scene, Korean chapter)
  return (
    text.includes("WISDOM 1") ||
    text.includes("WISDOM 2") ||
    text.includes("[WISDOM") ||
    text.includes("장면 9") ||
    text.includes("장면 10") ||
    text.includes("[장면 10]") ||
    // Korean chapter format: "9장", "10장" (AI may use N장 instead of 장면 N)
    /(?:^|\D)9\s*장[.:\s]/m.test(text) ||
    /(?:^|\D)10\s*장[.:\s]/m.test(text) ||
    // Also check for the completion celebration text as a safety net
    text.includes("축하합니다")
  );
}
