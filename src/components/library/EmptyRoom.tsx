"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Shelf3D from "./Shelf3D";

/**
 * Empty library state — shown when user has 0 completed stories.
 * Displays empty shelves with a warm invitation message and CTA.
 * Animal Crossing-inspired cozy "move-in" feeling.
 */
export default function EmptyRoom() {
  return (
    <div className="relative">
      {/* Empty shelves for visual context */}
      <Shelf3D
        stories={[]}
        shelfIndex={0}
        showEmptySlot
        isEmpty
      />
      <Shelf3D
        stories={[]}
        shelfIndex={1}
        showEmptySlot={false}
        isEmpty
      />

      {/* Warm invitation message */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
        className="text-center mt-4 mb-2"
      >
        <p className="font-serif text-base text-brown font-semibold mb-2 leading-relaxed">
          이 방을 나만의<br />이야기로 채워보세요
        </p>
        <p className="text-xs text-brown-light font-light mb-5 leading-relaxed">
          소중한 마음을 동화로 만들면<br />
          이 책장에 하나씩 쌓여갑니다
        </p>

        <Link
          href="/?action=start"
          className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          첫 동화 만들러 가기
        </Link>
      </motion.div>

      {/* Desk illustration — writing desk metaphor */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        className="mx-auto mt-6 flex items-center justify-center"
        style={{ width: 80, height: 48 }}
      >
        {/* Desk surface */}
        <div className="relative" style={{ width: 72, height: 36 }}>
          <div
            className="w-full rounded-t-md"
            style={{
              height: 8,
              background: "linear-gradient(180deg, rgba(var(--brown-mid), 0.25) 0%, rgba(var(--brown-mid), 0.35) 100%)",
            }}
          />
          <div
            className="w-full"
            style={{
              height: 28,
              background: "linear-gradient(180deg, rgba(var(--brown-pale), 0.2) 0%, rgba(var(--brown-mid), 0.15) 100%)",
              borderRadius: "0 0 4px 4px",
            }}
          />
          {/* Paper on desk */}
          <div
            className="absolute"
            style={{
              top: 4,
              left: 16,
              width: 20,
              height: 26,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 1,
              transform: "rotate(-3deg)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          />
          {/* Pencil SVG */}
          <svg
            className="absolute"
            style={{ top: 6, right: 14, transform: "rotate(25deg)" }}
            width="16"
            height="3"
            viewBox="0 0 24 4"
          >
            <rect x="0" y="0" width="20" height="4" rx="1" fill="rgba(var(--peach), 0.5)" />
            <polygon points="20,0 24,2 20,4" fill="rgba(var(--brown-mid), 0.4)" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
