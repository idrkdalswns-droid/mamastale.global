"use client";

import { motion } from "framer-motion";

/**
 * Animal Crossing-inspired room decorations.
 * All decorations use SVG/CSS only — no emojis.
 *
 * Elements:
 * - Floating leaves (SVG + Framer Motion)
 * - Potted plant (CSS)
 * - Picture frame on wall (CSS)
 * - Floor rug (CSS ellipse)
 * - Sparkle dots (CSS)
 */
export default function RoomDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]" aria-hidden="true">
      {/* ── Picture frame on wall ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.5 }}
        className="absolute"
        style={{ top: "6%", left: "8%", width: 48, height: 38 }}
      >
        {/* Frame border */}
        <div
          className="w-full h-full rounded-[3px]"
          style={{
            border: "2.5px solid rgba(var(--brown-mid), 0.35)",
            background: "linear-gradient(135deg, rgba(var(--mint), 0.15) 0%, rgba(var(--lavender), 0.1) 100%)",
            boxShadow: "1px 2px 4px rgba(var(--brown), 0.06)",
          }}
        >
          {/* Mini landscape inside frame */}
          <div className="w-full h-full relative overflow-hidden rounded-[1px]">
            {/* Sky */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(var(--mint), 0.2) 0%, rgba(var(--cream), 0.3) 60%)" }}
            />
            {/* Hill */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: "40%",
                borderRadius: "50% 50% 0 0",
                background: "rgba(var(--mint-deep), 0.2)",
              }}
            />
          </div>
        </div>
        {/* Hanging wire */}
        <svg
          viewBox="0 0 48 8"
          className="absolute -top-2 left-0"
          width={48}
          height={8}
        >
          <path
            d="M12 8 L24 2 L36 8"
            fill="none"
            stroke="rgba(var(--brown-pale), 0.3)"
            strokeWidth="1"
          />
        </svg>
      </motion.div>

      {/* ── Potted plant on shelf (bottom-right area) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, duration: 0.5, type: "spring", stiffness: 200 }}
        className="absolute"
        style={{ bottom: "22%", right: "10%" }}
      >
        {/* Leaves */}
        <div className="relative" style={{ width: 28, height: 30 }}>
          <div
            className="absolute"
            style={{
              width: 14,
              height: 18,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "rgba(var(--mint-deep), 0.35)",
              left: 2,
              top: 0,
              transform: "rotate(-15deg)",
            }}
          />
          <div
            className="absolute"
            style={{
              width: 14,
              height: 18,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "rgba(var(--mint), 0.4)",
              left: 10,
              top: 2,
              transform: "rotate(10deg)",
            }}
          />
          <div
            className="absolute"
            style={{
              width: 10,
              height: 14,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "rgba(var(--mint-deep), 0.3)",
              left: 6,
              top: -4,
              transform: "rotate(5deg)",
            }}
          />
        </div>
        {/* Pot */}
        <div
          style={{
            width: 18,
            height: 14,
            margin: "-4px auto 0",
            borderRadius: "2px 2px 4px 4px",
            background: "linear-gradient(180deg, rgba(var(--brown-mid), 0.45) 0%, rgba(var(--brown), 0.35) 100%)",
          }}
        />
      </motion.div>

      {/* ── Floor rug ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.35, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute"
        style={{
          bottom: "4%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "65%",
          height: 30,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(var(--lavender), 0.25) 0%, rgba(var(--peach), 0.1) 60%, transparent 100%)",
        }}
      />

      {/* ── Floating leaves ── */}
      {LEAVES.map((leaf) => (
        <motion.div
          key={leaf.id}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.5, 0.3, 0],
            y: [0, -leaf.floatY, -leaf.floatY * 0.6, 0],
            x: [0, leaf.floatX, -leaf.floatX * 0.5, 0],
            rotate: [0, leaf.rotate, -leaf.rotate * 0.4, 0],
          }}
          transition={{
            delay: 1.6 + leaf.delay,
            duration: leaf.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute"
          style={{ top: leaf.top, left: leaf.left }}
        >
          <svg width={leaf.size} height={leaf.size} viewBox="0 0 20 20">
            <path
              d="M10 2 C14 4, 18 10, 10 18 C2 10, 6 4, 10 2"
              fill={leaf.color}
              stroke="none"
            />
            {/* Leaf vein */}
            <path
              d="M10 4 L10 15"
              fill="none"
              stroke={leaf.veinColor}
              strokeWidth="0.5"
            />
          </svg>
        </motion.div>
      ))}

      {/* ── Sparkle dots ── */}
      {SPARKLES.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{
            delay: 2 + s.delay,
            duration: s.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: "rgba(var(--peach), 0.5)",
          }}
        />
      ))}
    </div>
  );
}

// Leaf data — positioned around the room edges
const LEAVES = [
  { id: 0, top: "15%", left: "85%", size: 14, floatY: 12, floatX: 6, rotate: 10, delay: 0, duration: 7, color: "rgba(var(--mint-deep), 0.25)", veinColor: "rgba(var(--mint-deep), 0.15)" },
  { id: 1, top: "35%", left: "5%", size: 11, floatY: 15, floatX: -8, rotate: -8, delay: 1.2, duration: 6, color: "rgba(var(--mint), 0.3)", veinColor: "rgba(var(--mint), 0.15)" },
  { id: 2, top: "55%", left: "90%", size: 10, floatY: 10, floatX: 5, rotate: 12, delay: 2.5, duration: 8, color: "rgba(var(--mint-deep), 0.2)", veinColor: "rgba(var(--mint-deep), 0.1)" },
  { id: 3, top: "20%", left: "45%", size: 9, floatY: 18, floatX: -4, rotate: -6, delay: 3.8, duration: 9, color: "rgba(var(--mint), 0.2)", veinColor: "rgba(var(--mint), 0.1)" },
];

// Sparkle data — subtle twinkling dots
const SPARKLES = [
  { id: 0, top: "12%", left: "72%", size: 3, delay: 0.5, duration: 3 },
  { id: 1, top: "42%", left: "18%", size: 2, delay: 1.8, duration: 4 },
  { id: 2, top: "28%", left: "55%", size: 2.5, delay: 3.2, duration: 3.5 },
];
