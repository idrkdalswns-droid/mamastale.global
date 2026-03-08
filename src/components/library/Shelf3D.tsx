"use client";

import { motion } from "framer-motion";
import Book3D from "./Book3D";
import Link from "next/link";
import type { Scene } from "@/lib/types/story";

const BOOKS_PER_SHELF = 5;

interface ShelfStory {
  id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
  is_public?: boolean;
}

interface Shelf3DProps {
  stories: ShelfStory[];
  colorOffset?: number;
  shelfIndex: number;
  /** If true, show empty book slot CTA at the end */
  showEmptySlot?: boolean;
  isEmpty?: boolean;
}

/**
 * 3D wooden shelf with books.
 * Uses CSS 3D to give the shelf depth (top face, front face, shadow).
 */
export default function Shelf3D({
  stories,
  colorOffset = 0,
  shelfIndex,
  showEmptySlot = false,
  isEmpty = false,
}: Shelf3DProps) {
  const hasRoom = stories.length < BOOKS_PER_SHELF && showEmptySlot;

  return (
    <motion.div
      initial={{ opacity: 0, x: shelfIndex % 2 === 0 ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.3 + shelfIndex * 0.15,
        duration: 0.5,
        ease: "easeOut",
      }}
      className="relative mb-8 preserve-3d"
    >
      {/* Books row */}
      <div className="flex items-end justify-center gap-3 pb-1 relative z-[2]">
        {stories.map((story, i) => (
          <Book3D
            key={story.id}
            story={story}
            colorIndex={colorOffset + i}
            index={shelfIndex * BOOKS_PER_SHELF + i}
          />
        ))}

        {/* Empty slot CTA */}
        {hasRoom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + shelfIndex * 0.15, duration: 0.4 }}
          >
            <Link
              href="/?action=start"
              className="flex flex-col items-center justify-center rounded-[3px] no-underline transition-all active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-coral"
              style={{
                width: 56,
                height: 140,
                border: "1.5px dashed rgba(224,122,95,0.3)",
                background: "rgba(224,122,95,0.04)",
              }}
              aria-label="새 동화 만들기"
            >
              <span
                className="text-xl font-light leading-none"
                style={{ color: `rgba(224,122,95,${isEmpty ? 0.55 : 0.35})` }}
              >
                +
              </span>
              <span
                className="text-[8px] font-light mt-1 text-center leading-tight"
                style={{ color: `rgba(224,122,95,${isEmpty ? 0.55 : 0.35})` }}
              >
                {isEmpty ? "첫 동화" : "새 동화"}
              </span>
            </Link>
          </motion.div>
        )}
      </div>

      {/* 3D Shelf plank */}
      <div className="relative preserve-3d" style={{ height: 14 }}>
        {/* Top face */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: 14,
            top: 0,
            background:
              "linear-gradient(180deg, rgba(var(--brown-mid), 0.35) 0%, rgba(var(--brown-mid), 0.45) 100%)",
            transform: "rotateX(-6deg) translateZ(3px)",
            transformOrigin: "bottom center",
            borderRadius: "2px 2px 0 0",
          }}
        />

        {/* Front face */}
        <div
          className="absolute left-0 right-0 shelf-plank"
          style={{
            height: 14,
            top: 0,
            transform: "translateZ(3px)",
          }}
        >
          <div className="shelf-plank-grain" />
        </div>

        {/* Bottom shadow */}
        <div
          className="absolute left-2 right-2"
          style={{
            height: 6,
            bottom: -4,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(var(--brown), 0.1) 0%, transparent 80%)",
            filter: "blur(3px)",
          }}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  );
}

export { BOOKS_PER_SHELF };
