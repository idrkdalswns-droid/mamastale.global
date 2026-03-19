/**
 * 이수지 스타일 AI 표지 프롬프트 엔진
 * Phase 4에서 생성된 imagePrompt를 이수지 화풍 prefix/suffix로 감싸서 반환
 */

import type { Scene } from "@/lib/types/story";

const STYLE_PREFIX = `Children's picture book cover illustration.
Minimalist watercolor painting with delicate black ink outlines.
Full bleed composition — artwork extends to ALL edges with NO white margins or borders.
Soft watercolor bleeding at edges INTO the scene, not into white space.
Soft muted pastel palette: pale rose, dusty blue, sage green, warm ivory tones.
Dreamy, ethereal, poetic atmosphere like Korean picture book art.
No text, no title, no words, no letters anywhere in the image.`;

const STYLE_SUFFIX = `Single cohesive cover composition. Vertical 3:4 book cover format.
IMPORTANT: The illustration must fill the entire canvas edge-to-edge with no white borders.
Professional illustration quality. Soft natural lighting.
Clean composition with a clear focal point.`;

const GENERIC_FALLBACK =
  "A mother and child in a warm, gentle scene surrounded by soft light";

export function buildCoverPrompt(scenes: Scene[]): string {
  const contentPrompt =
    scenes.find((s) => s.imagePrompt)?.imagePrompt || GENERIC_FALLBACK;
  return `${STYLE_PREFIX}\n\n${contentPrompt}\n\n${STYLE_SUFFIX}`;
}
