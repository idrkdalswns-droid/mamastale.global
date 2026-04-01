/**
 * Dalkkak (딸깍 동화) illustration image path helpers.
 *
 * Images live in /public/images/dalkkak/:
 *   q/{questionNum}-{choiceId}.jpeg   — Q1-Q19 × 4 choices (76 files)
 *   intro/door-{phase}.jpeg           — Phase intro images (5 files)
 */

/** Return the image path for a specific question choice, or null if unavailable. */
export function getChoiceImagePath(
  questionId: string,
  choiceId: number,
): string | null {
  const match = questionId.match(/^(?:p\d)?q(\d+)$/);
  if (!match) return null;
  const qNum = parseInt(match[1], 10);
  // Only Q1-Q19 have illustrations (Q20 is text input)
  if (qNum < 1 || qNum > 19) return null;
  if (choiceId < 1 || choiceId > 4) return null;
  return `/images/dalkkak/q/${qNum}-${choiceId}.jpeg`;
}

/** Return the intro illustration for a given phase (1-5). */
export function getIntroImagePath(phase: number): string | null {
  if (phase < 1 || phase > 5) return null;
  // Phase 1-5 maps to files 2-6.jpeg (1.jpeg is the hero image)
  return `/images/dalkkak/${phase + 1}.jpeg`;
}

/** Return the hero illustration for the landing page. */
export function getHeroImagePath(): string {
  return `/images/dalkkak/1.jpeg`;
}
