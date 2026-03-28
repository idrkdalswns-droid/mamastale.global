"use client";

import { TQ_PHASES, TQ_PHASE_COUNT } from "@/lib/constants/tq-phases";

interface DoorProgressProps {
  currentPhase: number;
  currentQuestionInPhase: number; // 0-based index within phase
  totalQuestionsInPhase: number;
}

export function DoorProgress({
  currentPhase,
  currentQuestionInPhase,
  totalQuestionsInPhase,
}: DoorProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto px-5">
      {/* 5 Doors */}
      <div role="list" aria-label="진행 단계" className="flex items-center justify-center gap-2.5 mb-2">
        {Array.from({ length: TQ_PHASE_COUNT }, (_, i) => i + 1).map((phase) => {
          const p = TQ_PHASES[phase];
          const isCompleted = phase < currentPhase;
          const isCurrent = phase === currentPhase;

          return (
            <div
              key={phase}
              role="listitem"
              aria-label={`${p.doorLabel}: ${isCompleted ? "완료" : isCurrent ? "진행 중" : "대기"}`}
              aria-current={isCurrent ? "step" : undefined}
              className="flex flex-col items-center"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  isCurrent ? "animate-pulse" : ""
                }`}
                style={{
                  background: isCompleted || isCurrent ? p.accent : "transparent",
                  border: `1.5px solid ${isCompleted || isCurrent ? p.accent : "rgba(196,149,106,0.2)"}`,
                  color: isCompleted || isCurrent ? "white" : "rgb(var(--brown-pale))",
                  boxShadow: isCurrent ? `0 2px 8px ${p.accent}33` : "none",
                }}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  phase
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current progress text */}
      <p className="text-center text-[11px] text-brown-pale font-light">
        Q{currentQuestionInPhase + 1} / {totalQuestionsInPhase}
      </p>
    </div>
  );
}
