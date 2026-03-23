"use client";

/**
 * Zustand store for worksheet generation wizard.
 * Manages step navigation, form state, and generation status.
 *
 * @module hooks/useWorksheetStore
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActivityType, AgeGroup } from "@/lib/worksheet/types";

export interface WorksheetWizardState {
  // Wizard navigation
  currentStep: number;
  totalSteps: number;
  direction: "forward" | "back";
  isOpen: boolean;

  // Form data
  storyId: string | null;
  storyTitle: string | null;
  activityType: ActivityType | null;
  ageGroup: AgeGroup | null;
  characterFocus: string | null;
  characterOptions: { name: string; role: string }[];
  contentFocus: string | null;
  outputStyle: string | null;
  extraDetail: string | null;
  isRecommended: boolean;

  // Generation
  generationStatus: "idle" | "generating" | "done" | "error";
  generatedHtml: string | null;
  nuriDomain: string | null;
  structuredData: Record<string, unknown> | null;
  activityTypeUsed: string | null;
  errorMessage: string | null;

  // Actions
  open: (storyId: string, storyTitle: string) => void;
  close: () => void;
  setActivityType: (type: ActivityType) => void;
  setAgeGroup: (age: AgeGroup) => void;
  setCharacterFocus: (character: string) => void;
  setCharacterOptions: (options: { name: string; role: string }[]) => void;
  setContentFocus: (focus: string) => void;
  setOutputStyle: (style: string) => void;
  setExtraDetail: (detail: string) => void;
  setRecommended: (value: boolean) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  startGeneration: () => void;
  setGenerationResult: (html: string, nuriDomain: string, structuredData?: Record<string, unknown>, activityTypeUsed?: string) => void;
  setGenerationError: (message: string) => void;
  reset: () => void;
}

const ACTIVITY_QUESTION_COUNTS: Record<ActivityType, number> = {
  emotion: 5,
  post_reading: 4,
  coloring: 3,
  story_map: 4,
  character_card: 4,
  vocabulary: 4,
  what_if: 4,
  speech_bubble: 4,
  roleplay_script: 5,
};

// Step layout:
// 0: ActivitySelect
// 1: AgeSelect (Q1)
// 2: CharacterSelect (Q2)
// 3: ContentFocus (Q3)
// 4: OutputStyle (Q4)
// 5: ExtraDetail (Q5, emotion/roleplay only)
// N-1: Confirm
// N: Result
function getTotalSteps(activityType: ActivityType | null): number {
  if (!activityType) return 6; // default before selection
  const questionCount = ACTIVITY_QUESTION_COUNTS[activityType] || 4;
  // Steps: ActivitySelect(1) + common(age+char=2) + specific(questionCount-2) + Confirm(1) + Result(1)
  // = 1 + questionCount + 2 = questionCount + 3
  return questionCount + 3;
}

const initialState = {
  currentStep: 0,
  totalSteps: 5,
  direction: "forward" as const,
  isOpen: false,
  storyId: null,
  storyTitle: null,
  activityType: null,
  ageGroup: null,
  characterFocus: null,
  characterOptions: [],
  contentFocus: null,
  outputStyle: null,
  extraDetail: null,
  isRecommended: false,
  generationStatus: "idle" as const,
  generatedHtml: null,
  nuriDomain: null,
  structuredData: null,
  activityTypeUsed: null,
  errorMessage: null,
};

export const useWorksheetStore = create<WorksheetWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      open: (storyId, storyTitle) =>
        set({
          ...initialState,
          isOpen: true,
          storyId,
          storyTitle,
        }),

      close: () => set({ isOpen: false }),

      setActivityType: (type) =>
        set({
          activityType: type,
          totalSteps: getTotalSteps(type),
          // Reset downstream selections when activity changes
          contentFocus: null,
          outputStyle: null,
          extraDetail: null,
        }),

      setAgeGroup: (age) => set({ ageGroup: age }),
      setCharacterFocus: (character) => set({ characterFocus: character }),
      setCharacterOptions: (options) => set({ characterOptions: options }),
      setContentFocus: (focus) => set({ contentFocus: focus }),
      setOutputStyle: (style) => set({ outputStyle: style }),
      setExtraDetail: (detail) => set({ extraDetail: detail }),
      setRecommended: (value) => set({ isRecommended: value }),

      goNext: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps - 1) {
          set({ currentStep: currentStep + 1, direction: "forward" });
        }
      },

      goBack: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1, direction: "back" });
        }
      },

      goToStep: (step) => {
        const { currentStep } = get();
        set({
          currentStep: step,
          direction: step > currentStep ? "forward" : "back",
        });
      },

      startGeneration: () =>
        set({ generationStatus: "generating", errorMessage: null }),

      setGenerationResult: (html, nuriDomain, structuredData, activityTypeUsed) =>
        set({
          generationStatus: "done",
          generatedHtml: html,
          nuriDomain,
          structuredData: structuredData ?? null,
          activityTypeUsed: activityTypeUsed ?? null,
          errorMessage: null,
        }),

      setGenerationError: (message) =>
        set({
          generationStatus: "error",
          errorMessage: message,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "mamastale_worksheet_wizard",
      partialize: (state) => ({
        storyId: state.storyId,
        storyTitle: state.storyTitle,
        activityType: state.activityType,
        ageGroup: state.ageGroup,
        characterFocus: state.characterFocus,
        contentFocus: state.contentFocus,
        outputStyle: state.outputStyle,
        extraDetail: state.extraDetail,
        isRecommended: state.isRecommended,
      }),
    }
  )
);
