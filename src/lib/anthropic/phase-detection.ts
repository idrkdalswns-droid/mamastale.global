/**
 * Detect phase tag [PHASE:N] from AI response
 * Handles variations: [PHASE:1], [PHASE: 1], [Phase:1], [phase: 1], [PHASE 1], etc.
 */
export function detectPhase(text: string): number | null {
  const match = text.match(/\[(?:PHASE|Phase|phase)[:\s]*(\d)\]/i);
  return match ? parseInt(match[1]) : null;
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
 * Check if story is complete (Phase 4 with WISDOM scenes).
 * @param text - The cleaned AI response text
 * @param phase - Detected phase from AI response (may be null if tag missing)
 * @param clientPhase - Current phase from client state (fallback when AI omits tag)
 */
export function isStoryComplete(text: string, phase: number | null, clientPhase?: number): boolean {
  // Use detected phase, falling back to client-reported phase
  const effectivePhase = phase ?? clientPhase ?? 0;
  if (effectivePhase !== 4) return false;

  // Check for story completion markers (both English and Korean)
  return (
    text.includes("WISDOM 1") ||
    text.includes("WISDOM 2") ||
    text.includes("[WISDOM") ||
    text.includes("장면 9") ||
    text.includes("장면 10") ||
    text.includes("[장면 10]") ||
    // Also check for the completion celebration text as a safety net
    text.includes("축하합니다")
  );
}
