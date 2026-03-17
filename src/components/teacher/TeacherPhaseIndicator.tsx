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
                className="w-6 h-0.5 mx-0.5 rounded-full transition-colors"
                style={{
                  backgroundColor: isActive ? info.accent : "#D4C5B0",
                }}
              />
            )}
            {/* 단계 원 */}
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full overflow-hidden relative"
                style={{
                  border: isActive ? `2px solid ${info.accent}` : "2px solid #F0E8DE",
                  transform: isCurrent ? "scale(1.2)" : "scale(1)",
                  boxShadow: isCurrent
                    ? `0 3px 10px ${info.accent}40`
                    : "none",
                  transition: "all 0.3s ease",
                }}
              >
                <Image src={info.icon} alt={info.name} fill className="object-cover" sizes="36px" />
              </div>
              <span
                className="text-[10px] mt-1 font-medium whitespace-nowrap"
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
