"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TQQuestion } from "@/lib/hooks/tq/questionSlice";

interface QuestionCardProps {
  question: TQQuestion;
  onAnswer: (choiceId: number, choiceText: string, scores: Record<string, number>) => void;
  phaseAccent: string;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  onAnswer,
  phaseAccent,
  disabled = false,
}: QuestionCardProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (choiceId: number) => {
      if (disabled || selectedId !== null) return;
      setSelectedId(choiceId);

      // Show feedback after selection animation
      setTimeout(() => setShowFeedback(true), 300);
    },
    [disabled, selectedId],
  );

  const handleNext = useCallback(() => {
    if (selectedId === null) return;
    const choice = question.choices.find((c) => c.id === selectedId);
    if (!choice) return;
    onAnswer(choice.id, choice.text, choice.scores);
    // Reset for next question
    setSelectedId(null);
    setShowFeedback(false);
  }, [selectedId, question.choices, onAnswer]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, choiceId: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(choiceId);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
        if (!items) return;
        const idx = Array.from(items).findIndex((el) => el === e.currentTarget);
        const next = e.key === "ArrowDown"
          ? items[(idx + 1) % items.length]
          : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }
    },
    [handleSelect],
  );

  const feedbackText = selectedId && question.feedback?.[selectedId];

  return (
    <div className="w-full max-w-md mx-auto px-5">
      {/* Question text */}
      <motion.p
        key={question.id + "-text"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-serif text-[18px] text-brown font-semibold leading-relaxed text-center mb-8 break-keep"
      >
        {question.text}
      </motion.p>

      {/* Choices */}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={question.text}
        className="space-y-3"
      >
        {question.choices.map((choice, i) => {
          const isSelected = selectedId === choice.id;
          const isUnselected = selectedId !== null && !isSelected;

          return (
            <motion.div
              key={choice.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={i === 0 && selectedId === null ? 0 : isSelected ? 0 : -1}
              onClick={() => handleSelect(choice.id)}
              onKeyDown={(e) => handleKeyDown(e, choice.id)}
              className="rounded-2xl px-4 py-3.5 text-[14px] leading-snug cursor-pointer transition-all duration-200 select-none focus:outline-none focus-visible:ring-2"
              style={{
                background: isSelected
                  ? `${phaseAccent}18`
                  : "rgba(255,255,255,0.7)",
                border: `1.5px solid ${isSelected ? phaseAccent : "rgba(196,149,106,0.12)"}`,
                opacity: isUnselected ? 0.55 : 1,
                transform: isSelected ? "scale(1)" : undefined,
                color: isUnselected ? "rgb(var(--brown-light))" : "rgb(var(--brown))",
                // Keep text contrast accessible even at reduced opacity
                ...(isUnselected && { fontWeight: 500 }),
                boxShadow: isSelected
                  ? `0 2px 12px ${phaseAccent}20`
                  : "0 1px 4px rgba(90,62,43,0.04)",
                // Focus ring color
                // @ts-expect-error CSS custom property
                "--tw-ring-color": phaseAccent,
              }}
            >
              <span className="line-clamp-3">{choice.text}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Feedback + Next */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-6 text-center"
          >
            {feedbackText && (
              <p className="text-[13px] text-brown-light font-light mb-4 break-keep">
                {feedbackText}
              </p>
            )}
            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${phaseAccent}, ${phaseAccent}cc)`,
                boxShadow: `0 4px 16px ${phaseAccent}30`,
              }}
            >
              다음
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
