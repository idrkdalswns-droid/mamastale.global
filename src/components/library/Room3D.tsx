"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Room3DProps {
  children: ReactNode;
}

/**
 * Animal Crossing-inspired 3D room container.
 * Uses CSS perspective to create the illusion of looking into a cozy room.
 */
export default function Room3D({ children }: Room3DProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full min-h-[70dvh] overflow-hidden rounded-2xl"
      style={{
        perspective: "800px",
        perspectiveOrigin: "50% 45%",
      }}
    >
      {/* Back wall */}
      <div
        className="absolute inset-0 room-back-wall"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--cream)) 0%, rgb(var(--paper)) 60%, rgb(var(--warm-ivory)) 100%)",
        }}
        aria-hidden="true"
      >
        {/* Subtle wall texture (fine dots) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(var(--brown-pale), 0.04) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
      </div>

      {/* Sunlight glow — top-right corner */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-20%",
          right: "-10%",
          width: "55%",
          height: "60%",
          background:
            "radial-gradient(ellipse, rgba(255,248,230,0.22) 0%, rgba(255,248,230,0.08) 40%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Left vignette */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none"
        style={{
          width: "15%",
          background:
            "linear-gradient(90deg, rgba(var(--brown), 0.04) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Right vignette */}
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none"
        style={{
          width: "15%",
          background:
            "linear-gradient(270deg, rgba(var(--brown), 0.04) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Content area with slight 3D tilt */}
      <div
        className="relative z-[2] px-4 pt-6 pb-16 preserve-3d"
        style={{
          transform: "rotateX(-2deg)",
          transformOrigin: "50% 30%",
        }}
      >
        {children}
      </div>

      {/* Floor */}
      <div
        className="absolute bottom-0 left-0 right-0 room-floor"
        style={{
          height: "18%",
          background:
            "linear-gradient(180deg, rgba(var(--brown-pale), 0.12) 0%, rgba(var(--brown-mid), 0.2) 50%, rgba(var(--brown), 0.15) 100%)",
        }}
        aria-hidden="true"
      >
        {/* Wood plank lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0px, rgba(var(--brown), 0.03) 1px, transparent 2px, transparent 60px)",
          }}
        />
      </div>
    </motion.div>
  );
}
