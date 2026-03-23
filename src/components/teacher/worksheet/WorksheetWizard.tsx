"use client";

/**
 * Worksheet generation wizard container.
 * Manages step transitions with Framer Motion AnimatePresence.
 *
 * @module teacher/worksheet/WorksheetWizard
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { getQuestionsForActivity } from "@/lib/worksheet/types";
import type { ActivityType } from "@/lib/worksheet/types";
import { ActivitySelectStep } from "./steps/ActivitySelectStep";
import { AgeSelectStep } from "./steps/AgeSelectStep";
import { CharacterSelectStep } from "./steps/CharacterSelectStep";
import { ContentFocusStep } from "./steps/ContentFocusStep";
import { OutputStyleStep } from "./steps/OutputStyleStep";
import { ExtraDetailStep } from "./steps/ExtraDetailStep";
import { ConfirmStep } from "./steps/ConfirmStep";
import { ResultStep } from "./steps/ResultStep";
import { DynamicProgressBar } from "./DynamicProgressBar";
import { GeneratingOverlay } from "./GeneratingOverlay";

/** Map question id → step component */
const QUESTION_STEP_MAP: Record<string, React.ReactNode> = {
  content_focus: <ContentFocusStep key="content" />,
  output_style: <OutputStyleStep key="output" />,
  extra_detail: <ExtraDetailStep key="extra" />,
};

/**
 * Build the dynamic step list based on activity type.
 * Fixed steps: ActivitySelect(0), AgeSelect(1), CharacterSelect(2)
 * Dynamic steps: from ACTIVITY_QUESTIONS (content_focus, output_style, extra_detail)
 * Final steps: Confirm, Result
 */
function buildStepList(activityType: ActivityType | null): React.ReactNode[] {
  const fixed: React.ReactNode[] = [
    <ActivitySelectStep key="activity" />,
    <AgeSelectStep key="age" />,
    <CharacterSelectStep key="character" />,
  ];

  let dynamic: React.ReactNode[] = [];
  if (activityType) {
    // getQuestionsForActivity returns common (age_group, character_focus) + specific questions
    // We only need the specific ones (skip common: age_group, character_focus)
    const allQuestions = getQuestionsForActivity(activityType);
    const specificQuestions = allQuestions.filter(
      (q) => q.id !== "age_group" && q.id !== "character_focus"
    );
    dynamic = specificQuestions
      .map((q) => QUESTION_STEP_MAP[q.id])
      .filter((step): step is React.ReactNode => !!step);
  }

  return [
    ...fixed,
    ...dynamic,
    <ConfirmStep key="confirm" />,
    <ResultStep key="result" />,
  ];
}

const variants = {
  enter: (dir: "forward" | "back") => ({
    x: dir === "forward" ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: "forward" | "back") => ({
    x: dir === "forward" ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function WorksheetWizard() {
  const {
    isOpen,
    currentStep,
    direction,
    activityType,
    generationStatus,
    close,
    goBack,
  } = useWorksheetStore();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Build step list dynamically based on activity type
  const steps = useMemo(() => buildStepList(activityType), [activityType]);
  const totalStepCount = steps.length;
  const resultStepIndex = totalStepCount - 1;
  const confirmStepIndex = totalStepCount - 2;

  if (!hydrated || !isOpen) return null;

  // Don't show progress on result step
  const showProgress = currentStep < resultStepIndex;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-cream w-full max-w-[430px] max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-brown-pale/20">
          {currentStep > 0 && currentStep < resultStepIndex ? (
            <button
              onClick={goBack}
              className="text-brown-light text-[14px] p-2 -ml-2 active:scale-95"
            >
              ← 이전
            </button>
          ) : (
            <div className="w-12" />
          )}
          <h2 className="text-[15px] font-medium text-brown">AI 맞춤 활동지</h2>
          <button
            onClick={close}
            className="text-brown-light text-[14px] p-2 -mr-2 active:scale-95"
          >
            닫기
          </button>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <DynamicProgressBar
            current={currentStep}
            total={confirmStepIndex}
          />
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {steps[currentStep] ?? steps[resultStepIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Generating Overlay */}
        {generationStatus === "generating" && <GeneratingOverlay />}
      </div>
    </div>
  );
}
