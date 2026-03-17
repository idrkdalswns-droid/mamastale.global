"use client";

import Image from "next/image";
import { TEACHER_PHASES, type TeacherPhase } from "@/lib/types/teacher";

interface TeacherPhaseIndicatorProps {
  currentPhase: TeacherPhase;
}

const PHASE_ORDER: TeacherPhase[] = ["A", "B", "C", "D", "E"];

export function TeacherPhaseIndicator({
  currentPhase,
}: TeacherPhaseIndicatorProps) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {PHASE_ORDER.map((phase, idx) => {
        const info = TEACHER_PHASES[phase];
        const isActive = idx <= currentIdx;
        const isCurrent = phase === currentPhase;

        return (
          <div key={phase} className="flex items-center">
            {/* 연결선 */}
            {idx > 0 && (
              <div
                className="w-4 h-0.5 mx-0.5 rounded-full transition-colors"
                style={{
                  backgroundColor: isActive ? info.accent : "#D4C5B0",
                }}
              />
            )}
            {/* 단계 원 */}
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all"
                style={{
                  backgroundColor: isActive ? info.accent : "#F0E8DE",
                  color: isActive ? "#FFF" : "#B5A28D",
                  transform: isCurrent ? "scale(1.15)" : "scale(1)",
                  boxShadow: isCurrent
                    ? `0 2px 8px ${info.accent}40`
                    : "none",
                }}
              >
                <Image src={info.icon} alt={info.name} width={16} height={16} className="rounded-full object-cover" />
              </div>
              <span
                className="text-[9px] mt-1 font-medium whitespace-nowrap"
                style={{ color: isActive ? info.text : "#B5A28D" }}
              >
                {info.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
