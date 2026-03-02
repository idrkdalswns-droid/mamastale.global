"use client";

import Link from "next/link";
import type { Scene } from "@/lib/types/story";

const SPINE_COLORS = [
  { bg: "rgba(224,122,95,0.82)",  edge: "rgba(192,100,75,0.9)",  text: "#FFF" },    // coral
  { bg: "rgba(127,191,176,0.75)", edge: "rgba(100,160,145,0.85)", text: "#2D5E50" }, // mint
  { bg: "rgba(200,184,216,0.78)", edge: "rgba(165,148,185,0.85)", text: "#3D2860" }, // lavender
  { bg: "rgba(109,76,145,0.78)",  edge: "rgba(82,55,118,0.85)",   text: "#FFF" },    // purple
  { bg: "rgba(232,168,124,0.80)", edge: "rgba(200,140,100,0.85)", text: "#5A3E2B" }, // peach
];

interface BookSpineProps {
  story: {
    id: string;
    title: string;
    scenes: Scene[];
    created_at: string;
    is_public?: boolean;
  };
  colorIndex: number;
}

export function BookSpine({ story, colorIndex }: BookSpineProps) {
  const color = SPINE_COLORS[colorIndex % SPINE_COLORS.length];
  const displayTitle = story.title.length > 8 ? story.title.slice(0, 7) + "…" : story.title;
  const sceneCount = story.scenes?.length || 0;

  return (
    <Link
      href={`/library/${story.id}`}
      className="group relative flex flex-col items-center no-underline transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
      style={{ width: 68, height: 170 }}
      aria-label={`${story.title} — ${sceneCount}장`}
    >
      {/* Book body */}
      <div
        className="relative w-full h-full rounded-[3px] overflow-hidden"
        style={{
          background: color.bg,
          boxShadow: "2px 2px 6px rgba(90,62,43,0.12), -1px 0 3px rgba(90,62,43,0.06)",
        }}
      >
        {/* Binding edge (left strip) */}
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 4, background: color.edge }}
        />

        {/* Title — vertical */}
        <div
          className="absolute inset-0 flex items-center justify-center pl-2 pr-1"
          style={{ writingMode: "vertical-rl" }}
        >
          <span
            className="font-serif text-[11px] font-semibold leading-tight tracking-wide"
            style={{ color: color.text }}
          >
            {displayTitle}
          </span>
        </div>

        {/* Scene count at bottom */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span
            className="text-[8px] font-light"
            style={{ color: color.text, opacity: 0.7 }}
          >
            {sceneCount}장
          </span>
          {story.is_public && (
            <div
              className="text-[7px] mt-0.5"
              style={{ color: color.text, opacity: 0.6 }}
              aria-label="커뮤니티 공유됨"
            >
              🌍
            </div>
          )}
        </div>

        {/* Subtle top/bottom book edges */}
        <div
          className="absolute top-0 left-1 right-0 h-[2px]"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
        <div
          className="absolute bottom-0 left-1 right-0 h-[1px]"
          style={{ background: "rgba(0,0,0,0.08)" }}
        />
      </div>
    </Link>
  );
}

interface EmptySlotProps {
  isCTA?: boolean;
  isEmpty?: boolean; // true when user has 0 stories
}

export function EmptySlot({ isCTA, isEmpty }: EmptySlotProps) {
  if (isCTA) {
    return (
      <Link
        href="/?action=start"
        className="flex flex-col items-center justify-center rounded-[3px] no-underline transition-all active:scale-[0.97]"
        style={{
          width: 68,
          height: 170,
          border: "1.5px dashed rgba(224,122,95,0.3)",
          background: "rgba(224,122,95,0.03)",
        }}
        aria-label="새 동화 만들기"
      >
        <span
          className="text-2xl font-light leading-none"
          style={{ color: `rgba(224,122,95,${isEmpty ? 0.55 : 0.35})` }}
        >
          +
        </span>
        <span
          className="text-[9px] font-light mt-1.5 text-center leading-tight"
          style={{ color: `rgba(224,122,95,${isEmpty ? 0.55 : 0.35})` }}
        >
          {isEmpty ? "첫 동화\n만들기" : "새 동화"}
        </span>
      </Link>
    );
  }

  return (
    <div
      className="rounded-[3px]"
      style={{
        width: 68,
        height: 170,
        border: "1.5px dashed rgba(196,149,106,0.15)",
        background: "rgba(255,255,255,0.25)",
      }}
      aria-hidden="true"
    >
      {/* Ghost book silhouette */}
      <div className="w-full h-full flex items-center justify-center opacity-[0.08]">
        <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
          <rect x="1" y="1" width="18" height="26" rx="1" stroke="currentColor" strokeWidth="1.5" className="text-brown" />
          <line x1="5" y1="1" x2="5" y2="27" stroke="currentColor" strokeWidth="1" className="text-brown" />
        </svg>
      </div>
    </div>
  );
}
