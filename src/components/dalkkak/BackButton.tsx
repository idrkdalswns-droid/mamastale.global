"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { TQ_PHASES } from "@/lib/constants/tq-phases";

export function BackButton() {
  const router = useRouter();
  const { currentPhase, currentQuestionIndex, prevQuestion, questions } = useTQStore();

  const handleBack = useCallback(() => {
    // Q1 of phase 1 → back to landing
    if (currentPhase === 1 && currentQuestionIndex === 0) {
      router.push("/dalkkak");
      return;
    }

    // First question of a phase → can't go back across phase boundary
    const phaseRange = TQ_PHASES[currentPhase]?.questionRange;
    if (phaseRange) {
      const firstQInPhase = `q${phaseRange[0]}`;
      const currentQ = questions[currentQuestionIndex];
      if (currentQ?.id === firstQInPhase) {
        toast("이전 단계로 돌아갈 수 없어요", {
          icon: "🚪",
          style: {
            background: "rgb(var(--cream))",
            color: "rgb(var(--brown))",
            fontSize: "13px",
          },
          duration: 2000,
        });
        return;
      }
    }

    // Within phase → go to previous question
    prevQuestion();
  }, [currentPhase, currentQuestionIndex, questions, prevQuestion, router]);

  return (
    <button
      onClick={handleBack}
      className="min-h-[44px] min-w-[44px] flex items-center text-[12px] text-brown-light transition-all active:scale-[0.95]"
      aria-label="이전으로"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="ml-0.5">이전</span>
    </button>
  );
}
