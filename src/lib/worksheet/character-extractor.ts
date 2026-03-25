/**
 * Lazy character extraction for existing stories without character metadata.
 * Uses Haiku 4.5 to extract character info from story text,
 * then stores it in stories.metadata.characters for future use.
 *
 * @module character-extractor
 */

import { getAnthropicClient } from "@/lib/anthropic/client";
import type { StoryCharacter } from "@/lib/utils/story-parser";

const CHARACTER_EXTRACTION_PROMPT = `다음 동화에서 등장하는 캐릭터 목록을 추출하세요.

각 캐릭터에 대해 다음 정보를 JSON 배열로 출력하세요:
- name: 캐릭터 이름 (예: "꼬마 여우")
- role: "protagonist" (주인공), "helper" (조력자), "antagonist" (방해자) 중 하나
- traits: 성격 특성 2~3개 배열 (예: ["용감한", "호기심 많은"])
- emotion: 감정 여정을 한 문장으로 (예: "외로움에서 용기로")

JSON 배열만 출력하세요. 다른 텍스트는 불필요합니다.`;

/**
 * Extract characters from story text using Haiku 4.5.
 * Returns parsed StoryCharacter array.
 */
export async function extractCharactersFromStory(
  storyText: string
): Promise<StoryCharacter[]> {
  const client = getAnthropicClient();

  try {
    // BugBounty-FIX: Add 15s timeout to prevent indefinite hang
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${CHARACTER_EXTRACTION_PROMPT}\n\n## 동화 전문\n${storyText}`,
        },
      ],
    }, { signal: AbortSignal.timeout(15_000) });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    // Validate and sanitize each character
    return parsed
      .filter(
        (c: Record<string, unknown>) =>
          typeof c.name === "string" && c.name.trim().length > 0
      )
      .map((c: Record<string, unknown>) => ({
        name: String(c.name).trim().slice(0, 50),
        role: ["protagonist", "helper", "antagonist"].includes(
          String(c.role || "")
        )
          ? String(c.role)
          : "protagonist",
        traits: Array.isArray(c.traits)
          ? c.traits
              .filter((t: unknown) => typeof t === "string")
              .slice(0, 5)
              .map((t: unknown) => String(t).trim().slice(0, 20))
          : [],
        emotion: typeof c.emotion === "string" ? c.emotion.trim().slice(0, 100) : "",
      }));
  } catch (error) {
    console.error("[character-extractor] Failed to extract characters:", error);
    return [];
  }
}

/**
 * Ensure a story has character metadata. If missing, extract lazily and save.
 * Returns the character list (empty array if extraction fails).
 */
export async function ensureCharacterMetadata(
  storyId: string,
  storyText: string,
  supabase: { from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]> },
  tableName: "stories" | "teacher_stories" = "teacher_stories"
): Promise<StoryCharacter[]> {
  // Check if characters already exist
  const { data: story } = await supabase
    .from(tableName)
    .select("metadata")
    .eq("id", storyId)
    .single();

  const metadata = (story?.metadata as Record<string, unknown>) || {};
  const existing = metadata.characters as StoryCharacter[] | undefined;

  if (Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  // Extract characters from story text
  const characters = await extractCharactersFromStory(storyText);

  if (characters.length > 0) {
    // Save back to DB for future use
    await supabase
      .from(tableName)
      .update({
        metadata: { ...metadata, characters },
      })
      .eq("id", storyId);
  }

  return characters;
}
