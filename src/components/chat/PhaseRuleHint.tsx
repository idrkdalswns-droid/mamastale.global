"use client";

import { PHASES } from "@/lib/constants/phases";

interface PhaseRuleHintProps {
  phase: number;
}

export default function PhaseRuleHint({ phase }: PhaseRuleHintProps) {
  const p = PHASES[phase];

  return (
    <div className="fixed bottom-[68px] left-0 right-0 z-50">
      <div className="max-w-[430px] mx-auto px-2.5">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px]"
          style={{
            background: `${p.bg}EE`,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: `1px solid ${p.accent}12`,
          }}
        >
          <div
            className="w-1 h-1 rounded-full shrink-0"
            style={{ background: p.accent }}
          />
          <span
            className="text-[10px] font-light leading-[1.4] opacity-50"
            style={{ color: p.text }}
          >
            {p.rule}
          </span>
        </div>
      </div>
    </div>
  );
}
