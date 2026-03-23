/**
 * 5-layer modular prompt builder.
 * Assembles system prompt from: Base + Activity + Age + ContentFocus + OutputStyle
 *
 * @module worksheet/prompts/builder
 */

import type { WorksheetParams } from "../types";
import type { StoryCharacter } from "@/lib/utils/story-parser";
import { BASE_MODULE } from "./base";
import { AGE_MODULES } from "./age-modules";
import {
  EMOTION_ACTIVITY_MODULE,
  EMOTION_CONTENT_FOCUS,
  EMOTION_OUTPUT_STYLE,
} from "./activities/emotion";
import {
  POST_READING_ACTIVITY_MODULE,
  POST_READING_CONTENT_FOCUS,
  POST_READING_OUTPUT_STYLE,
} from "./activities/post-reading";
import {
  COLORING_ACTIVITY_MODULE,
  COLORING_CONTENT_FOCUS,
} from "./activities/coloring";
import {
  VOCABULARY_ACTIVITY_MODULE,
  VOCABULARY_CONTENT_FOCUS,
  VOCABULARY_OUTPUT_STYLE,
} from "./activities/vocabulary";
import {
  CHARACTER_CARD_ACTIVITY_MODULE,
  CHARACTER_CARD_CONTENT_FOCUS,
  CHARACTER_CARD_OUTPUT_STYLE,
} from "./activities/character-card";
import {
  STORY_MAP_ACTIVITY_MODULE,
  STORY_MAP_CONTENT_FOCUS,
  STORY_MAP_OUTPUT_STYLE,
} from "./activities/story-map";
import {
  WHAT_IF_ACTIVITY_MODULE,
  WHAT_IF_CONTENT_FOCUS,
  WHAT_IF_OUTPUT_STYLE,
} from "./activities/what-if";
import {
  SPEECH_BUBBLE_ACTIVITY_MODULE,
  SPEECH_BUBBLE_CONTENT_FOCUS,
  SPEECH_BUBBLE_OUTPUT_STYLE,
} from "./activities/speech-bubble";
import {
  ROLEPLAY_SCRIPT_ACTIVITY_MODULE,
  ROLEPLAY_SCRIPT_CONTENT_FOCUS,
  ROLEPLAY_SCRIPT_OUTPUT_STYLE,
} from "./activities/roleplay-script";

/** Activity-specific modules */
const ACTIVITY_MODULES: Record<string, string> = {
  emotion: EMOTION_ACTIVITY_MODULE,
  post_reading: POST_READING_ACTIVITY_MODULE,
  coloring: COLORING_ACTIVITY_MODULE,
  vocabulary: VOCABULARY_ACTIVITY_MODULE,
  character_card: CHARACTER_CARD_ACTIVITY_MODULE,
  story_map: STORY_MAP_ACTIVITY_MODULE,
  what_if: WHAT_IF_ACTIVITY_MODULE,
  speech_bubble: SPEECH_BUBBLE_ACTIVITY_MODULE,
  roleplay_script: ROLEPLAY_SCRIPT_ACTIVITY_MODULE,
};

/** Content focus modules indexed by activity type */
const CONTENT_FOCUS_MODULES: Record<string, Record<string, string>> = {
  emotion: EMOTION_CONTENT_FOCUS,
  post_reading: POST_READING_CONTENT_FOCUS,
  coloring: COLORING_CONTENT_FOCUS,
  vocabulary: VOCABULARY_CONTENT_FOCUS,
  character_card: CHARACTER_CARD_CONTENT_FOCUS,
  story_map: STORY_MAP_CONTENT_FOCUS,
  what_if: WHAT_IF_CONTENT_FOCUS,
  speech_bubble: SPEECH_BUBBLE_CONTENT_FOCUS,
  roleplay_script: ROLEPLAY_SCRIPT_CONTENT_FOCUS,
};

/** Output style modules indexed by activity type */
const OUTPUT_STYLE_MODULES: Record<string, Record<string, string>> = {
  emotion: EMOTION_OUTPUT_STYLE,
  post_reading: POST_READING_OUTPUT_STYLE,
  vocabulary: VOCABULARY_OUTPUT_STYLE,
  character_card: CHARACTER_CARD_OUTPUT_STYLE,
  story_map: STORY_MAP_OUTPUT_STYLE,
  what_if: WHAT_IF_OUTPUT_STYLE,
  speech_bubble: SPEECH_BUBBLE_OUTPUT_STYLE,
  roleplay_script: ROLEPLAY_SCRIPT_OUTPUT_STYLE,
};

/** Build character focus module from character metadata */
function buildCharacterModule(
  characterFocus: string,
  characters: StoryCharacter[]
): string {
  if (!characters.length) {
    return `## 캐릭터: 동화 전체의 모든 캐릭터를 다룹니다.`;
  }

  if (characterFocus === "all") {
    const charList = characters
      .map((c) => `- ${c.name} (${c.role}): ${c.traits.join(", ")} — ${c.emotion}`)
      .join("\n");
    return `## 캐릭터: 모든 캐릭터\n${charList}`;
  }

  const target = characters.find((c) => c.name === characterFocus);
  if (target) {
    return `## 집중 캐릭터: ${target.name}
- 역할: ${target.role}
- 특성: ${target.traits.join(", ")}
- 감정 여정: ${target.emotion}
이 캐릭터에 집중하여 활동지를 구성하세요.`;
  }

  return `## 캐릭터: "${characterFocus}"에 집중하여 활동지를 구성하세요.`;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

/**
 * Build the complete prompt for worksheet generation.
 * 5-layer assembly: Base + Activity + Age + Character + ContentFocus + OutputStyle
 */
export function buildWorksheetPrompt(
  params: WorksheetParams,
  storyText: string,
  characters: StoryCharacter[]
): BuiltPrompt {
  const activityModule = ACTIVITY_MODULES[params.activity_type];
  if (!activityModule) {
    throw new Error(`Unsupported activity type: ${params.activity_type}`);
  }

  const contentFocusModules = CONTENT_FOCUS_MODULES[params.activity_type] || {};
  const outputStyleModules = OUTPUT_STYLE_MODULES[params.activity_type] || {};

  const system = [
    BASE_MODULE,
    activityModule,
    AGE_MODULES[params.age_group],
    buildCharacterModule(params.character_focus, characters),
    contentFocusModules[params.content_focus] || "",
    outputStyleModules[params.output_style] || "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userParts = [`## 동화 전문\n${storyText}`];
  if (params.extra_detail) {
    userParts.push(`## 추가 설정\n${params.extra_detail}`);
  }

  return {
    system,
    user: userParts.join("\n\n"),
  };
}
