"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Scene } from "@/lib/types/story";

const SPINE_COLORS = [
  { bg: "rgba(224,122,95,0.85)", edge: "rgba(192,100,75,0.92)", text: "#FFF", pages: "rgba(250,240,228,0.9)" },
  { bg: "rgba(127,191,176,0.78)", edge: "rgba(100,160,145,0.88)", text: "#2D5E50", pages: "rgba(245,250,248,0.9)" },
  { bg: "rgba(200,184,216,0.80)", edge: "rgba(165,148,185,0.88)", text: "#3D2860", pages: "rgba(248,245,252,0.9)" },
  { bg: "rgba(109,76,145,0.80)", edge: "rgba(82,55,118,0.88)", text: "#FFF", pages: "rgba(245,240,250,0.9)" },
  { bg: "rgba(232,168,124,0.82)", edge: "rgba(200,140,100,0.88)", text: "#5A3E2B", pages: "rgba(252,248,242,0.9)" },
];

const BOOK_W = 56;
const BOOK_H = 140;
const BOOK_D = 16; // depth/thickness

interface Book3DProps {
  story: {
    id: string;
    title: string;
    scenes: Scene[];
    created_at: string;
    is_public?: boolean;
  };
  colorIndex: number;
  index: number;
}

export default function Book3D({ story, colorIndex, index }: Book3DProps) {
  const color = SPINE_COLORS[colorIndex % SPINE_COLORS.length];
  const displayTitle =
    story.title.length > 8 ? story.title.slice(0, 7) + "\u2026" : story.title;
  const sceneCount = story.scenes?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        delay: 0.4 + index * 0.07,
        duration: 0.5,
        type: "spring",
        stiffness: 180,
        damping: 18,
      }}
      className="preserve-3d"
      style={{ width: BOOK_W, height: BOOK_H }}
    >
      <Link
        href={`/library/${story.id}`}
        className="group relative block no-underline focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
        aria-label={`${story.title} \u2014 ${sceneCount}\uc7a5`}
        style={{
          width: BOOK_W,
          height: BOOK_H,
          transformStyle: "preserve-3d",
          transform: "rotateY(-8deg)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform =
            "rotateY(-22deg) translateZ(10px) scale(1.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "rotateY(-8deg)";
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLElement).style.transform =
            "rotateY(-22deg) translateZ(10px) scale(1.04)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "rotateY(-8deg)";
        }}
      >
        {/* Front cover */}
        <div
          className="absolute inset-0 rounded-[2px] overflow-hidden"
          style={{
            background: color.bg,
            transform: `translateZ(${BOOK_D / 2}px)`,
            backfaceVisibility: "hidden",
            boxShadow: "2px 3px 8px rgba(90,62,43,0.15)",
          }}
        >
          {/* Binding edge (left strip) */}
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: 4, background: color.edge }}
          />

          {/* Title — vertical */}
          <div
            className="absolute inset-0 flex items-center justify-center pl-2.5 pr-1"
            style={{ writingMode: "vertical-rl" }}
          >
            <span
              className="font-serif text-[10px] font-semibold leading-tight tracking-wider"
              style={{ color: color.text }}
            >
              {displayTitle}
            </span>
          </div>

          {/* Scene count at bottom */}
          <div className="absolute bottom-1.5 left-0 right-0 text-center">
            <span
              className="text-[7px] font-light"
              style={{ color: color.text, opacity: 0.65 }}
            >
              {sceneCount}\uc7a5
            </span>
            {story.is_public && (
              <div
                className="text-[6px] mt-0.5"
                style={{ color: color.text, opacity: 0.5 }}
              >
                \uacf5\uc720
              </div>
            )}
          </div>

          {/* Subtle edge highlights */}
          <div
            className="absolute top-0 left-1 right-0 h-[1.5px]"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
          <div
            className="absolute bottom-0 left-1 right-0 h-[1px]"
            style={{ background: "rgba(0,0,0,0.06)" }}
          />
        </div>

        {/* Back cover */}
        <div
          className="absolute inset-0 rounded-[2px]"
          style={{
            background: color.edge,
            transform: `translateZ(-${BOOK_D / 2}px)`,
            backfaceVisibility: "hidden",
          }}
        />

        {/* Spine (left edge connecting front to back) */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            width: BOOK_D,
            left: 0,
            background: color.edge,
            transform: `rotateY(-90deg) translateZ(0px)`,
            transformOrigin: "left center",
          }}
        />

        {/* Page edges (right side) */}
        <div
          className="absolute top-[2px] bottom-[2px]"
          style={{
            width: BOOK_D,
            right: 0,
            background: color.pages,
            transform: `rotateY(90deg) translateZ(${BOOK_W}px)`,
            transformOrigin: "left center",
          }}
        >
          {/* Page line details */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0px, rgba(var(--brown-pale), 0.08) 1px, transparent 2px, transparent 4px)",
            }}
          />
        </div>

        {/* Top edge */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: BOOK_D,
            top: 0,
            background: color.pages,
            transform: `rotateX(90deg) translateZ(0px)`,
            transformOrigin: "top center",
          }}
        />

        {/* Bottom edge */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: BOOK_D,
            bottom: 0,
            background: `linear-gradient(180deg, ${color.pages} 60%, rgba(var(--brown-pale), 0.15) 100%)`,
            transform: `rotateX(-90deg) translateZ(0px)`,
            transformOrigin: "bottom center",
          }}
        />
      </Link>
    </motion.div>
  );
}
