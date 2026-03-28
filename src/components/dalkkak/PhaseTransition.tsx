"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TQ_PHASES } from "@/lib/constants/tq-phases";

const DOOR_MESSAGES: Record<number, string> = {
  2: "두 번째 문",
  3: "세 번째 문",
  4: "네 번째 문",
  5: "마지막 문",
};

interface PhaseTransitionProps {
  fromPhase: number;
  toPhase: number;
  isReady: boolean; // AI response received
  onComplete: () => void;
}

export function PhaseTransition({
  toPhase,
  isReady,
  onComplete,
}: PhaseTransitionProps) {
  const [minTimePassed, setMinTimePassed] = useState(false);
  const phase = TQ_PHASES[toPhase];
  const message = DOOR_MESSAGES[toPhase] || `${toPhase}번째 문`;

  // Minimum 2s display
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-proceed when both conditions met
  useEffect(() => {
    if (minTimePassed && isReady) {
      const timer = setTimeout(onComplete, 300);
      return () => clearTimeout(timer);
    }
  }, [minTimePassed, isReady, onComplete]);

  const canProceed = minTimePassed && isReady;

  // Respect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: phase ? `rgb(${phase.bg})` : "rgb(var(--cream))" }}
      >
        {/* Door icon */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.3,
              duration: prefersReducedMotion ? 0 : 0.5,
              ease: "easeOut",
            }}
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{
              background: phase?.accent || "#C4956A",
              boxShadow: `0 8px 32px ${phase?.accent || "#C4956A"}40`,
            }}
          >
            <span className="text-white text-2xl font-bold">{toPhase}</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.6,
              duration: prefersReducedMotion ? 0 : 0.4,
            }}
            className="font-serif text-[20px] text-brown font-bold mb-2"
          >
            {message}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.9,
              duration: prefersReducedMotion ? 0 : 0.3,
            }}
            className="text-[13px] text-brown-light font-light"
          >
            {phase?.name || ""}
          </motion.p>

          {/* Waiting message or tap to proceed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : 1.2 }}
            className="mt-8"
          >
            {canProceed ? (
              <button
                onClick={onComplete}
                className="px-6 py-2.5 rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: phase?.accent || "#C4956A",
                  boxShadow: `0 4px 16px ${phase?.accent || "#C4956A"}30`,
                }}
                autoFocus
              >
                계속하기
              </button>
            ) : (
              <p className="text-[12px] text-brown-pale font-light animate-pulse">
                다음 문을 준비하고 있어요...
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
