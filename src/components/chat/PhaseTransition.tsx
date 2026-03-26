"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { T } from "@/lib/constants/design-tokens";
import { PHASES } from "@/lib/constants/phases";

interface PhaseTransitionProps {
  isVisible: boolean;
  phase: number;
}

const PHASE_MESSAGES: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "마음의 문을 열어볼까요",
    subtitle: "편안하게 이야기를 들려주세요",
  },
  2: {
    title: "함께 마음을 들여다봐요",
    subtitle: "상처의 뿌리를 조심스럽게 살펴볼게요",
  },
  3: {
    title: "이야기가 동화로 바뀌어요",
    subtitle: "어머니의 경험이 아름다운 은유가 됩니다",
  },
  4: {
    title: "동화가 완성되어 가요",
    subtitle: "세상에 하나뿐인 마음의 이야기",
  },
};

export default function PhaseTransition({
  isVisible,
  phase,
}: PhaseTransitionProps) {
  if (phase < 1 || phase > 4) return null;
  const p = PHASES[phase];
  const msg = PHASE_MESSAGES[phase] || PHASE_MESSAGES[1];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          role="status"
          aria-live="polite"
          aria-label={`${phase}단계로 전환: ${msg.title}`}
          className="absolute inset-0 z-[200] flex items-center justify-center"
          style={{
            background: "rgba(251,245,236,0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-center px-8"
          >
            {p?.icon && (
              <div className="w-[52px] h-[52px] rounded-full overflow-hidden relative mx-auto mb-4">
                <Image src={p.icon} alt={p.name} fill className="object-cover" sizes="52px" />
              </div>
            )}

            {/* Phase indicator */}
            <div
              className="inline-block px-3 py-1 rounded-full text-[10px] font-medium tracking-wider mb-3"
              style={{
                background: `${p?.accent}15`,
                color: p?.accent,
                border: `1px solid ${p?.accent}25`,
              }}
            >
              {phase}단계 / 4
            </div>

            {/* Friendly transition message */}
            <div
              className="text-lg font-semibold mb-1.5"
              style={{
                color: T.brown,
                fontFamily: "var(--font-nanum), serif",
              }}
            >
              {msg.title}
            </div>

            <div
              className="text-xs font-normal leading-relaxed"
              style={{ color: T.brownMid, opacity: 0.7 }}
            >
              {msg.subtitle}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
