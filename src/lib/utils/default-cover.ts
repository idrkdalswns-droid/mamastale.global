/**
 * Deterministic default cover assignment for stories without an explicit cover_image.
 *
 * Strategy:
 *  1. If the story has a recognised topic, map it to a tone (pink/green/blue)
 *     and pick within that tone using a hash of the storyId.
 *  2. Otherwise hash the storyId across all 45 covers.
 *
 * All generated paths satisfy the PATCH whitelist regex:
 *   /^\/images\/covers\/cover_(pink|green|blue)\d{2}\.(png|jpeg)$/
 */

type CoverTone = "pink" | "green" | "blue";

interface ToneInfo {
  count: number;
  startIndex: number;
  ext: string;
}

const COVER_COUNTS: Record<CoverTone, ToneInfo> = {
  pink: { count: 16, startIndex: 1, ext: "png" },
  green: { count: 14, startIndex: 1, ext: "jpeg" },
  blue: { count: 15, startIndex: 0, ext: "jpeg" },
};

const TOPIC_TO_TONE: Record<string, CoverTone> = {
  산후우울: "blue",
  양육번아웃: "pink",
  시댁갈등: "green",
  경력단절: "blue",
  자존감: "pink",
};

/** Simple deterministic hash — always returns a positive integer */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Build a cover path for a given tone + index offset */
function coverPathForTone(tone: CoverTone, index: number): string {
  const info = COVER_COUNTS[tone];
  const safeIndex = info.startIndex + (index % info.count);
  return `/images/covers/cover_${tone}${String(safeIndex).padStart(2, "0")}.${info.ext}`;
}

/**
 * Return a deterministic default cover image path for a story.
 * Uses topic-based tone mapping when available, otherwise hashes across all 45 covers.
 */
export function getDefaultCover(storyId: string, topic?: string | null): string {
  const hash = simpleHash(storyId);

  if (topic && TOPIC_TO_TONE[topic]) {
    return coverPathForTone(TOPIC_TO_TONE[topic], hash);
  }

  // Fallback: distribute across all 45 covers
  const index = hash % 45;
  if (index < 16) return coverPathForTone("pink", index);
  if (index < 30) return coverPathForTone("green", index - 16);
  return coverPathForTone("blue", index - 30);
}

/**
 * Resolve a story's cover image — returns the explicit cover or a deterministic default.
 * Safe to call with any combination of null/undefined values.
 */
export function resolveCover(
  coverImage: string | null | undefined,
  storyId: string,
  topic?: string | null,
): string {
  return coverImage || getDefaultCover(storyId, topic);
}
