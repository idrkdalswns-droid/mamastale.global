/**
 * Age-based derived parameters lookup table.
 * These 12 design variables are automatically determined by age selection.
 * Based on REPORT_04 developmental research.
 *
 * @module worksheet/age-params
 */

import type { AgeGroup, DerivedParams, ActivityType } from "./types";

export const AGE_PARAMS: Record<AgeGroup, DerivedParams> = {
  age_3: {
    font_size_body_pt: 24,
    font_size_title_pt: 33,
    drawing_space_ratio: 0.75,
    line_thickness_mm: 2.5,
    coloring_regions: 4,
    sentence_length: "3~5어절",
    activity_duration_min: 7,
    hangul_level: "whole_word",
    instruction_complexity: "icon_only",
    max_elements_per_page: 1,
    vocabulary_level: 900,
    writing_ratio: 0.1,
  },
  age_4: {
    font_size_body_pt: 20,
    font_size_title_pt: 28,
    drawing_space_ratio: 0.65,
    line_thickness_mm: 1.75,
    coloring_regions: 7,
    sentence_length: "3~7어절",
    activity_duration_min: 12,
    hangul_level: "no_batchim",
    instruction_complexity: "simple_sentence",
    max_elements_per_page: 2,
    vocabulary_level: 1500,
    writing_ratio: 0.3,
  },
  age_5: {
    font_size_body_pt: 18,
    font_size_title_pt: 24,
    drawing_space_ratio: 0.55,
    line_thickness_mm: 1.25,
    coloring_regions: 10,
    sentence_length: "5~8어절 이상",
    activity_duration_min: 17,
    hangul_level: "with_batchim",
    instruction_complexity: "full_sentence",
    max_elements_per_page: 3,
    vocabulary_level: 2500,
    writing_ratio: 0.5,
  },
  mixed: {
    font_size_body_pt: 21,
    font_size_title_pt: 28,
    drawing_space_ratio: 0.65,
    line_thickness_mm: 2,
    coloring_regions: 8,
    sentence_length: "만4세 기준",
    activity_duration_min: 12,
    hangul_level: "no_batchim",
    instruction_complexity: "simple_sentence",
    max_elements_per_page: 2,
    vocabulary_level: 1500,
    writing_ratio: 0.3,
  },
};

/** "추천해주세요" default values per age+activity */
export function getRecommendedDefaults(
  ageGroup: AgeGroup,
  activityType: ActivityType
): { content_focus: string; output_style: string; extra_detail?: string } {
  if (activityType === "emotion") {
    switch (ageGroup) {
      case "age_3":
        return { content_focus: "specific_emotion", output_style: "matching", extra_detail: "simple" };
      case "age_4":
        return { content_focus: "emotion_change", output_style: "mixed", extra_detail: "simple" };
      case "age_5":
        return { content_focus: "emotion_change", output_style: "mixed", extra_detail: "complex" };
      case "mixed":
        return { content_focus: "emotion_change", output_style: "mixed", extra_detail: "simple" };
    }
  }

  if (activityType === "post_reading") {
    switch (ageGroup) {
      case "age_3":
        return { content_focus: "comprehension", output_style: "drawing_heavy" };
      case "age_4":
        return { content_focus: "appreciation", output_style: "balanced" };
      case "age_5":
        return { content_focus: "creative", output_style: "writing_heavy" };
      case "mixed":
        return { content_focus: "appreciation", output_style: "balanced" };
    }
  }

  // Fallback for future activity types
  return { content_focus: "default", output_style: "default" };
}
