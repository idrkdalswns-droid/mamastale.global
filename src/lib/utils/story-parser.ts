import type { Scene } from "@/lib/types/story";

// v1.22.3 G1: Module-scope regex compilation (previously compiled per cleanSceneText() call)
// Array-based for easy pattern addition. ⚠️ "계속해서" alone is too broad — matches story prose.
const AI_COMMENT_STARTS = [
  "계속해서 완성해", "계속해서 만들어",
  "이제 이 동화", "그리고 당신", "당신의 사랑스러운",
  "어머니의 이야기를", "이 이야기를", "마음 동화 여정",
  "치유의 시간", "함께 해주셔서",
];
const AI_COMMENT_PATTERN = new RegExp(`^(${AI_COMMENT_STARTS.join("|")})[^\\n]*$`, "gm");

/**
 * Extract AI-generated story title from [TITLE: ...] marker (v1.22.0).
 * Returns null if no marker found — caller should fall back to default title.
 */
export function extractStoryTitle(text: string): string | null {
  const match = text.match(/\[TITLE:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

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
  // v1.22.0: Strip [TITLE:] and [STORY_END] markers
  cleaned = cleaned.replace(/^\[TITLE:.*\]$/gim, "");
  cleaned = cleaned.replace(/\[STORY_END\]/gi, "");
  // Phase 4 closing celebration / grounding / self-care lines
  // (line-start anchor — won't match mid-sentence in story prose)
  cleaned = cleaned.replace(/^(축하합니다|당신은 방금|이 동화는 단순한|이건 당신의 여정|당신의 강함의|당신의 사랑의|동화가 완성되었어요|오늘 나눈 이야기는|깊은 숨을 쉬어보세요|오늘 많은 감정을|자신을 위해|당신은 충분히|지금 이 순간의|어머니의 용기에서)[^\n]*$/gm, "");
  // AI meta phrases (scene instructions, author notes, commentary)
  cleaned = cleaned.replace(/^(이 장면에서는|다음 장면으로|작가 노트|이 이야기는|이 동화가|당신의 이야기|당신의 동화|이야기를 통해|위의 동화는)[^\n]*$/gm, "");
  cleaned = cleaned.replace(/^\(해설\)[^\n]*$/gm, "");
  // AI conversational comments that leak into story text (v1.21.2)
  // v1.22.3 G1: Module-scope compiled regex (was per-call — unnecessary recompilation)
  cleaned = cleaned.replace(AI_COMMENT_PATTERN, "");
  // AI verb patterns — only on lines NOT starting with quotes (protect story dialogue)
  cleaned = cleaned.replace(/^[^"\u201C\n]*(?:완성해드릴까요|변환했습니다|읽어주세요\.|만들어볼게요)[^\n]*$/gm, "");

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

  // 6. Strip heading markers (# at start of line) — handles ##제목 (no space) and ## alone
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");

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
  // Strip everything after [STORY_END] — celebration/grounding/self-care text (v1.22.0)
  const storyEndIdx = allPhase4Text.indexOf("[STORY_END]");
  const storyText = storyEndIdx >= 0 ? allPhase4Text.slice(0, storyEndIdx) : allPhase4Text;

  const scenes: Scene[] = [];

  // ─── Strategy 1: English section tags (primary — matches system prompt) ───
  // Matches: [INTRO 1], [CONFLICT 2], [ATTEMPT 1], [RESOLUTION 2], [WISDOM 1], etc.
  const englishPattern = /\[(INTRO|CONFLICT|ATTEMPT|RESOLUTION|WISDOM)\s*(\d)\]/gi;
  const englishMatches = [...storyText.matchAll(englishPattern)];

  if (englishMatches.length >= 3) {
    // Found enough English tags — use this strategy
    for (let i = 0; i < englishMatches.length; i++) {
      const match = englishMatches[i];
      const sectionKey = `${match[1].toUpperCase()} ${match[2]}`;
      const sceneNum = SECTION_TO_SCENE[sectionKey];
      if (!sceneNum || scenes.some((s) => s.sceneNumber === sceneNum)) continue;

      const startIdx = match.index! + match[0].length;
      const endIdx = i < englishMatches.length - 1 ? englishMatches[i + 1].index! : storyText.length;
      let block = storyText.slice(startIdx, endIdx).trim();

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
    const koreanMatches = [...storyText.matchAll(koreanPattern)];

    for (let i = 0; i < koreanMatches.length; i++) {
      const match = koreanMatches[i];
      const sceneNum = parseInt(match[1] || match[2] || match[3]);
      if (sceneNum < 1 || sceneNum > 10 || scenes.some((s) => s.sceneNumber === sceneNum)) continue;

      const startIdx = match.index! + match[0].length;
      const endIdx = i < koreanMatches.length - 1 ? koreanMatches[i + 1].index! : storyText.length;
      let block = storyText.slice(startIdx, endIdx).trim();

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
    const numberedMatches = [...storyText.matchAll(numberedPattern)];

    for (let i = 0; i < numberedMatches.length; i++) {
      const match = numberedMatches[i];
      const sceneNum = parseInt(match[1]);
      if (sceneNum < 1 || sceneNum > 10 || scenes.some((s) => s.sceneNumber === sceneNum)) continue;

      const startIdx = match.index! + match[0].length;
      const endIdx = i < numberedMatches.length - 1 ? numberedMatches[i + 1].index! : storyText.length;
      let block = storyText.slice(startIdx, endIdx).trim();

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
 * Character metadata extracted from [CHARACTERS]...[/CHARACTERS] block.
 * Added for worksheet service — activities need structured character data.
 */
export interface StoryCharacter {
  name: string;
  role: string; // "protagonist" | "helper" | "antagonist"
  traits: string[];
  emotion: string;
}

/**
 * Parse character metadata from AI response.
 * Looks for [CHARACTERS]...[/CHARACTERS] block after [STORY_END].
 * Returns empty array if no block found (graceful degradation).
 */
export function parseStoryCharacters(fullText: string): StoryCharacter[] {
  const match = fullText.match(/\[CHARACTERS\]([\s\S]*?)\[\/CHARACTERS\]/i);
  if (!match) return [];

  const block = match[1].trim();
  const characters: StoryCharacter[] = [];

  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("-")) continue;

    const nameMatch = trimmed.match(/이름:\s*([^|]+)/);
    const roleMatch = trimmed.match(/역할:\s*([^|]+)/);
    const traitsMatch = trimmed.match(/특성:\s*([^|]+)/);
    const emotionMatch = trimmed.match(/감정여정:\s*(.+)/);

    if (nameMatch) {
      characters.push({
        name: nameMatch[1].trim(),
        role: roleMatch?.[1]?.trim() || "protagonist",
        traits: traitsMatch?.[1]?.trim().split(/[,，、]\s*/).filter(Boolean) || [],
        emotion: emotionMatch?.[1]?.trim() || "",
      });
    }
  }

  return characters;
}

