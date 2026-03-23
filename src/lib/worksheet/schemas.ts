/**
 * Zod schemas for Claude structured output validation.
 * Each schema defines the expected JSON structure from Claude's response.
 *
 * @module worksheet/schemas
 */

import { z } from "zod";
import type { ActivityType } from "./types";

// ─── Emotion Worksheet Schema ───
export const EmotionWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("사회관계"),
  emotion_scenes: z
    .array(
      z.object({
        scene_summary: z.string().max(200),
        emotion: z.string().max(30),
        character: z.string().max(50),
        question: z.string().max(150),
      })
    )
    .min(1)
    .max(10),
  emotion_icons: z
    .array(
      z.object({
        emotion: z.string().max(30),
        label: z.string().max(30),
      })
    )
    .min(3)
    .max(10),
  body_mapping_prompt: z.string().max(200).optional(),
});

// ─── Post-Reading Worksheet Schema ───
export const PostReadingWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("의사소통"),
  comprehension_questions: z
    .array(
      z.object({
        question: z.string().max(200),
        type: z.enum(["recall", "inference", "opinion"]),
      })
    )
    .min(2)
    .max(8),
  drawing_prompt: z.string().max(200),
  writing_prompt: z.string().max(200),
  creative_extension: z.string().max(200).optional(),
});

// ─── Coloring Worksheet Schema ───
export const ColoringWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("예술경험"),
  coloring_scenes: z
    .array(
      z.object({
        scene_description: z.string().max(300),
        elements: z.array(z.string().max(80)).min(1).max(8),
        mood: z.string().max(50),
      })
    )
    .min(1)
    .max(3),
  color_suggestion: z.string().max(300).optional(),
  free_drawing_prompt: z.string().max(300),
});

// ─── Vocabulary Worksheet Schema ───
export const VocabularyWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("의사소통"),
  words: z
    .array(
      z.object({
        word: z.string().max(30),
        meaning: z.string().max(150),
        example_sentence: z.string().max(200),
        category: z.enum([
          "emotion_word",
          "action_word",
          "noun",
          "adjective",
          "onomatopoeia",
        ]),
        drawing_hint: z.string().max(150),
      })
    )
    .min(3)
    .max(8),
  word_puzzle: z
    .object({
      type: z.enum(["matching", "fill_blank", "initial_sound"]),
      question: z.string().max(300),
      items: z.array(z.string().max(100)).min(2).max(6),
    })
    .optional(),
  writing_practice_word: z.string().max(30).optional(),
});

// ─── Character Card Worksheet Schema ───
export const CharacterCardWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("사회관계"),
  characters: z
    .array(
      z.object({
        name: z.string().max(80),
        role: z.string().max(50),
        appearance: z.string().max(200),
        personality: z.array(z.string().max(50)).min(1).max(4),
        favorite_thing: z.string().max(150),
        emotion_keyword: z.string().max(50),
        relationship: z.string().max(150).optional(),
        drawing_prompt: z.string().max(200),
      })
    )
    .min(1)
    .max(4),
  comparison_question: z.string().max(300).optional(),
});

// ─── Story Map Worksheet Schema ───
export const StoryMapWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("의사소통"),
  phases: z
    .array(
      z.object({
        phase_name: z.string().max(50),
        summary: z.string().max(300),
        characters_involved: z.array(z.string().max(80)),
        drawing_prompt: z.string().max(200),
        emotion_tone: z.string().max(50),
      })
    )
    .min(3)
    .max(5),
  connection_labels: z.array(z.string().max(80)).optional(),
});

// ─── What-If Worksheet Schema ───
export const WhatIfWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("사회관계"),
  scenario: z.object({
    scene_summary: z.string().max(300),
    character: z.string().max(50),
    dilemma: z.string().max(300),
  }),
  perspective_questions: z
    .array(
      z.object({
        question: z.string().max(300),
        type: z.enum(["feeling", "action", "empathy", "creative"]),
      })
    )
    .min(2)
    .max(5),
  drawing_prompt: z.string().max(300),
  my_story_prompt: z.string().max(300).optional(),
});

// ─── Speech Bubble Worksheet Schema ───
export const SpeechBubbleWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("의사소통"),
  dialogue_pairs: z
    .array(
      z.object({
        character: z.string().max(50),
        line: z.string().max(300),
        is_empty: z.boolean(),
        bubble_type: z.enum(["speech", "thought", "shout"]),
        emotion: z.string().max(30),
        position: z.enum(["left", "right"]),
      })
    )
    .min(3)
    .max(8),
  free_dialogue_prompt: z.string().max(300).optional(),
});

// ─── Roleplay Script Worksheet Schema ───
export const RoleplayScriptWorksheetSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  instructions: z.string().max(400),
  nuri_domain: z.literal("예술경험"),
  characters_list: z
    .array(
      z.object({
        name: z.string().max(50),
        role_description: z.string().max(200),
        costume_hint: z.string().max(200),
      })
    )
    .min(2)
    .max(4),
  scenes: z
    .array(
      z.object({
        scene_title: z.string().max(80),
        narrator_line: z.string().max(300),
        lines: z
          .array(
            z.object({
              speaker: z.string().max(50),
              line: z.string().max(300),
              stage_direction: z.string().max(200).optional(),
              emotion_cue: z.string().max(50).optional(),
            })
          )
          .min(1)
          .max(6),
      })
    )
    .min(2)
    .max(4),
  props_list: z.array(z.string().max(80)).max(5),
  discussion_after: z.string().max(300).optional(),
});

// ─── Schema Registry ───
export type EmotionWorksheetOutput = z.infer<typeof EmotionWorksheetSchema>;
export type PostReadingWorksheetOutput = z.infer<typeof PostReadingWorksheetSchema>;
export type ColoringWorksheetOutput = z.infer<typeof ColoringWorksheetSchema>;
export type VocabularyWorksheetOutput = z.infer<typeof VocabularyWorksheetSchema>;
export type CharacterCardWorksheetOutput = z.infer<typeof CharacterCardWorksheetSchema>;
export type StoryMapWorksheetOutput = z.infer<typeof StoryMapWorksheetSchema>;
export type WhatIfWorksheetOutput = z.infer<typeof WhatIfWorksheetSchema>;
export type SpeechBubbleWorksheetOutput = z.infer<typeof SpeechBubbleWorksheetSchema>;
export type RoleplayScriptWorksheetOutput = z.infer<typeof RoleplayScriptWorksheetSchema>;

export type WorksheetOutput =
  | EmotionWorksheetOutput
  | PostReadingWorksheetOutput
  | ColoringWorksheetOutput
  | VocabularyWorksheetOutput
  | CharacterCardWorksheetOutput
  | StoryMapWorksheetOutput
  | WhatIfWorksheetOutput
  | SpeechBubbleWorksheetOutput
  | RoleplayScriptWorksheetOutput;

/** Get the Zod schema for a given activity type */
export function getWorksheetSchema(activityType: ActivityType) {
  switch (activityType) {
    case "emotion":
      return EmotionWorksheetSchema;
    case "post_reading":
      return PostReadingWorksheetSchema;
    case "coloring":
      return ColoringWorksheetSchema;
    case "vocabulary":
      return VocabularyWorksheetSchema;
    case "character_card":
      return CharacterCardWorksheetSchema;
    case "story_map":
      return StoryMapWorksheetSchema;
    case "what_if":
      return WhatIfWorksheetSchema;
    case "speech_bubble":
      return SpeechBubbleWorksheetSchema;
    case "roleplay_script":
      return RoleplayScriptWorksheetSchema;
    default:
      throw new Error(`Unsupported activity type: ${activityType}`);
  }
}
