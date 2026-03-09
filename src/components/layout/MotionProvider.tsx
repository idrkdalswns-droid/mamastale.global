"use client";

import { MotionConfig } from "framer-motion";

/**
 * R1-A11Y: Wrap children with Framer Motion's MotionConfig
 * to respect prefers-reduced-motion at the JS animation level.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
