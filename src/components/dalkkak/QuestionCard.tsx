"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getChoiceImagePath } from "@/lib/utils/dalkkak-images";
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
  const [submitting, setSubmitting] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const groupRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (choiceId: number) => {
      if (disabled || submitting) return;
      setSelectedId(choiceId);

      // Show feedback after selection animation
      setTimeout(() => setShowFeedback(true), 300);
    },
    [disabled, submitting],
  );

  const handleNext = useCallback(() => {
    if (selectedId === null || submitting) return;
    const choice = question.choices.find((c) => c.id === selectedId);
    if (!choice) return;
    setSubmitting(true);
    onAnswer(choice.id, choice.text, choice.scores);
  }, [selectedId, submitting, question.choices, onAnswer]);

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

  const handleImageError = useCallback((choiceId: number) => {
    setBrokenImages((prev) => new Set(prev).add(choiceId));
  }, []);

  const feedbackText = selectedId && question.feedback?.[selectedId];

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Question text */}
      <motion.p
        key={question.id + "-text"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-serif text-[16px] text-brown font-semibold leading-relaxed text-center mb-4 break-keep"
      >
        {question.text}
      </motion.p>

      {/* Choices */}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={question.text}
        className="space-y-2"
      >
        {question.choices.map((choice, i) => {
          const isSelected = selectedId === choice.id;
          const isUnselected = selectedId !== null && !isSelected;
          const imagePath = getChoiceImagePath(question.id, choice.id);
          const showImage = imagePath && !brokenImages.has(choice.id);

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
              className="rounded-2xl px-3 py-2 text-[13px] leading-snug cursor-pointer transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 flex items-center gap-3"
              style={{
                background: isSelected
                  ? `${phaseAccent}18`
                  : "rgba(255,255,255,0.7)",
                border: `1.5px solid ${isSelected ? phaseAccent : "rgba(196,149,106,0.12)"}`,
                opacity: isUnselected ? 0.55 : 1,
                color: isUnselected ? "rgb(var(--brown-light))" : "rgb(var(--brown))",
                ...(isUnselected && { fontWeight: 500 }),
                boxShadow: isSelected
                  ? `0 2px 12px ${phaseAccent}20`
                  : "0 1px 4px rgba(90,62,43,0.04)",
                // @ts-expect-error CSS custom property
                "--tw-ring-color": phaseAccent,
              }}
            >
              {showImage && (
                <img
                  src={imagePath}
                  alt=""
                  loading="lazy"
                  onError={() => handleImageError(choice.id)}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 transition-all duration-200"
                  style={{
                    boxShadow: isSelected ? `0 0 0 2px ${phaseAccent}40` : undefined,
                  }}
                />
              )}
              <span className="line-clamp-2 flex-1">{choice.text}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Feedback + Next / Loading spinner */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-center"
          >
            {feedbackText && (
              <p className="text-[13px] text-brown-light font-light mb-3 break-keep">
                {feedbackText}
              </p>
            )}
            {submitting ? (
              <div className="flex items-center justify-center gap-2 py-3">
                <div
                  className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin"
                  style={{ color: phaseAccent }}
                />
                <span className="text-[12px] text-brown-light font-light">
                  다음 질문을 준비하고 있어요
                </span>
              </div>
            ) : (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
