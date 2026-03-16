import type { Scene } from "@/lib/types/story";

/**
 * Clean markdown artifacts and HTML entities from scene text.
 * Applied during parsing to ensure clean Korean prose in all downstream consumers
 * (StoryViewer, StoryEditor, PDF, copy/share).
 */
export function cleanSceneText(text: string): string {
  // P1-FIX(D1): Null/undefined defense — DB JSONB can produce null despite TypeScript signature
  if (!text) return "";

  let cleaned = text;

  // 1. Decode HTML entities FIRST — loop to handle multi-level encoding
  //    e.g., &amp;amp;quot; → &amp;quot; → &quot; → "
  //    LAUNCH-FIX: Max 10 iterations to prevent infinite loop on malformed input
  let prev = "";
  let decodeIter = 0;
  while (prev !== cleaned && decodeIter < 10) {
    prev = cleaned;
    decodeIter++;
    cleaned = cleaned
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#0?39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  // 1b. LAUNCH-FIX R2: Strip any HTML tags that may have been decoded from entities
  // Defense-in-depth: ensures no raw HTML survives into clean output
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // 1c. P1-FIX(C2): Strip AI meta-commentary lines
  cleaned = cleaned.replace(/^\[TAGS:.*\]$/gim, "");
  cleaned = cleaned.replace(/^\[Image Prompt:.*\]$/gim, "");
  // Phase 4 closing celebration lines (line-start anchor — won't match mid-sentence)
  cleaned = cleaned.replace(/^(축하합니다|당신은 방금|이 동화는 단순한|이건 당신의 여정|당신의 강함의|당신의 사랑의|동화가 완성되었어요|오늘 나눈 이야기는|깊은 숨을 쉬어보세요)[^\n]*$/gm, "");
  // AI meta phrases (scene instructions, author notes)
  cleaned = cleaned.replace(/^(이 장면에서는|다음 장면으로|작가 노트)[^\n]*$/gm, "");
  cleaned = cleaned.replace(/^\(해설\)[^\n]*$/gm, "");

  // 2. Strip horizontal rules (--- or *** or ___)
  cleaned = cleaned.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, "");

  // 3. Strip bold markers ** or __ (must come before italic)
  //    Use [\s\S] instead of /s flag for ES2017 compat (tsconfig target)
  cleaned = cleaned.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([\s\S]+?)__/g, "$1");
  // 3b. Strip any remaining orphan ** markers (unmatched pairs, line-boundary leftovers)
  cleaned = cleaned.replace(/\*\*/g, "");

  // 4. Strip italic markers * or _
  cleaned = cleaned.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1");
  cleaned = cleaned.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "$1");

  // 5. Strip strikethrough ~~
  cleaned = cleaned.replace(/~~(.+?)~~/g, "$1");

  // 6. Strip heading markers (# at start of line)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 7. Strip inline code backticks
  cleaned = cleaned.replace(/`([^`]+?)`/g, "$1");

  // 8. Clean excessive whitespace: 3+ blank lines → 2 lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // 9. Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Map English section tags (from system prompt) to scene numbers.
 * System prompt format: [INTRO 1], [INTRO 2], [CONFLICT 1], etc.
 */
const SECTION_TO_SCENE: Record<string, number> = {
  "INTRO 1": 1,
  "INTRO 2": 2,
  "CONFLICT 1": 3,
  "CONFLICT 2": 4,
  "ATTEMPT 1": 5,
  "ATTEMPT 2": 6,
  "RESOLUTION 1": 7,
  "RESOLUTION 2": 8,
  "WISDOM 1": 9,
  "WISDOM 2": 10,
};

const SCENE_TITLES: Record<number, string> = {
  1: "도입 1",
  2: "도입 2",
  3: "갈등 1",
  4: "갈등 2",
  5: "시도 1",
  6: "시도 2",
  7: "해결 1",
  8: "해결 2",
  9: "교훈 1",
  10: "교훈 2",
};

/**
 * Parse 10-scene fairy tale from Phase 4 AI responses.
 * Supports multiple formats:
 *   1. English section tags: [INTRO 1], [CONFLICT 2], [WISDOM 1], etc.
 *   2. Korean scene tags:    [장면 1], 장면 1:, **장면 1**, etc.
 *   2b. Korean chapter tags:  **1장.**, 1장:, 2장 , etc.
 *   3. Numbered list:         1., 2., etc.
 */
export function parseStoryScenes(allPhase4Text: string): Scene[] {
  const scenes: Scene[] = [];

  // ─── Strategy 1: English section tags (primary — matches system prompt) ───
  // Matches: [INTRO 1], [CONFLICT 2], [ATTEMPT 1], [RESOLUTION 2], [WISDOM 1], etc.
  const englishPattern = /\[(INTRO|CONFLICT|ATTEMPT|RESOLUTION|WISDOM)\s*(\d)\]/gi;
  const englishMatches = [...allPhase4Text.matchAll(englishPattern)];

  if (englishMatches.length >= 3) {
    // Found enough English tags — use this strategy
    for (let i = 0; i < englishMatches.length; i++) {
      const match = englishMatches[i];
      const sectionKey = `${match[1].toUpperCase()} ${match[2]}`;
      const sceneNum = SECTION_TO_SCENE[sectionKey];
      if (!sceneNum || scenes.some((s) => s.sceneNumber === sceneNum)) continue;

      const startIdx = match.index! + match[0].length;
      const endIdx = i < englishMatches.length - 1 ? englishMatches[i + 1].index! : allPhase4Text.length;
      let block = allPhase4Text.slice(startIdx, endIdx).trim();

      // Strip the "— description" part after the tag (e.g., "— 문제 상황 소개")
      // IMPORTANT: Only strip if line starts with a dash/em-dash, NOT just whitespace
      // Otherwise we'd delete the first sentence of the scene content
      block = block.replace(/^[\s]*[—–\-]{1,3}\s*[^\n]*\n?/, "").trim();

      // Extract image prompt if present
      let imagePrompt: string | undefined;
      const imgMatch = block.match(/\[Image Prompt:\s*(.*?)\]/i);
      if (imgMatch) {
        imagePrompt = imgMatch[1].trim();
        block = block.replace(imgMatch[0], "").trim();
      }

      if (block.length > 0) {
        scenes.push({
          sceneNumber: sceneNum,
          title: SCENE_TITLES[sceneNum] || `장면 ${sceneNum}`,
          text: cleanSceneText(block),
          imagePrompt,
        });
      }
    }
  }

  // ─── Strategy 2: Korean scene/chapter tags (fallback) ───
  if (scenes.length < 3) {
    scenes.length = 0; // Reset and try Korean patterns
    // Matches: [장면 1], 장면 1:, **장면 1**, 장면1., **1장.**, 1장:, 1장 , etc.
    const koreanPattern = /(?:\[장면\s*(\d+)\]|\*?\*?장면\s*(\d+)\*?\*?[:\.\s]|\*?\*?\s*(\d{1,2})\s*장[.:\s])/g;
    const koreanMatches = [...allPhase4Text.matchAll(koreanPattern)];

    for (let i = 0; i < koreanMatches.length; i++) {
      const match = koreanMatches[i];
      const sceneNum = parseInt(match[1] || match[2] || match[3]);
      if (sceneNum < 1 || sceneNum > 10 || scenes.some((s) => s.sceneNumber === sceneNum)) continue;

      const startIdx = match.index! + match[0].length;
      const endIdx = i < koreanMatches.length - 1 ? koreanMatches[i + 1].index! : allPhase4Text.length;
      let block = allPhase4Text.slice(startIdx, endIdx).trim();

      // For "N장" format: strip the chapter title line (e.g., "평화로운 토끼 마을**")
      if (match[3]) {
        block = block.replace(/^[^\n]*\n/, "").trim();
      }

      let imagePrompt: string | undefined;
      const imgMatch = block.match(/\[Image Prompt:\s*(.*?)\]/i);
      if (imgMatch) {
        imagePrompt = imgMatch[1].trim();
        block = block.replace(imgMatch[0], "").trim();
      }

      if (block.length > 0) {
        scenes.push({
          sceneNumber: sceneNum,
          title: SCENE_TITLES[sceneNum] || `장면 ${sceneNum}`,
          text: cleanSceneText(block),
          imagePrompt,
        });
      }
    }
  }

  // ─── Strategy 3: Numbered list fallback (1., 2., etc.) ───
  if (scenes.length < 3) {
    scenes.length = 0;
    const numberedPattern = /(?:^|\n)\s*(\d{1,2})\s*[.)]\s*/g;
    const numberedMatches = [...allPhase4Text.matchAll(numberedPattern)];

    for (let i = 0; i < numberedMatches.length; i++) {
      const match = numberedMatches[i];
      const sceneNum = parseInt(match[1]);
      if (sceneNum < 1 || sceneNum > 10 || scenes.some((s) => s.sceneNumber === sceneNum)) continue;

      const startIdx = match.index! + match[0].length;
      const endIdx = i < numberedMatches.length - 1 ? numberedMatches[i + 1].index! : allPhase4Text.length;
      let block = allPhase4Text.slice(startIdx, endIdx).trim();

      let imagePrompt: string | undefined;
      const imgMatch = block.match(/\[Image Prompt:\s*(.*?)\]/i);
      if (imgMatch) {
        imagePrompt = imgMatch[1].trim();
        block = block.replace(imgMatch[0], "").trim();
      }

      if (block.length > 5) { // Minimum content length
        scenes.push({
          sceneNumber: sceneNum,
          title: SCENE_TITLES[sceneNum] || `장면 ${sceneNum}`,
          text: cleanSceneText(block),
          imagePrompt,
        });
      }
    }
  }

  // Sort by sceneNumber to ensure correct order
  scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);

  return scenes;
}

/**
 * Combine all Phase 4 assistant messages into a single text for parsing
 */
export function combinePhase4Messages(
  messages: { role: string; content: string; phase?: number }[]
): string {
  return messages
    .filter((m) => m.role === "assistant" && m.phase === 4)
    .map((m) => m.content)
    .join("\n\n");
}
