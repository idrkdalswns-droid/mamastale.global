"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PHASES } from "@/lib/constants/phases";

interface TypingIndicatorProps {
  phase: number;
}

export default function TypingIndicator({ phase }: TypingIndicatorProps) {
  const p = PHASES[phase];
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const hint = elapsed >= 25 ? "거의 다 됐어요..." : elapsed >= 12 ? "조금만 기다려 주세요..." : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex items-start gap-2 mb-3.5"
    >
      {/* Phase icon avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{
          background: `${p.accent}12`,
          border: `1px solid ${p.accent}18`,
        }}
      >
        {p.icon}
      </div>

      <div>
        {/* Bouncing dots bubble */}
        <div
          className="flex gap-[5px] px-[18px] py-[13px]"
          style={{
            background: "rgba(255,255,255,0.75)",
            borderRadius: "20px 20px 20px 5px",
          }}
        >
          {[0, 1, 2].map((d) => (
            <motion.div
              key={d}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: p.accent, opacity: 0.4 }}
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 1.2,
                ease: "easeInOut",
                repeat: Infinity,
                delay: d * 0.15,
              }}
            />
          ))}
        </div>
        {/* Delayed hint message */}
        <AnimatePresence>
          {hint && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-brown-pale font-light mt-1.5 ml-1"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
