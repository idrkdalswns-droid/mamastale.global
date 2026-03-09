"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipe } from "@/lib/hooks/useSwipe";
import { resolveCover } from "@/lib/utils/default-cover";
import type { Scene } from "@/lib/types/story";

interface StoryItem {
  id: string;
  title: string;
  scenes: Scene[];
  status: string;
  is_public?: boolean;
  cover_image?: string;
  topic?: string;
  created_at: string;
}

interface StoryCarouselProps {
  stories: StoryItem[];
}

import type { Variants } from "framer-motion";

const SLIDE_VARIANTS: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 280 : -280,
    opacity: 0,
    scale: 0.88,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -280 : 280,
    opacity: 0,
    scale: 0.88,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  }),
};

export default function StoryCarousel({ stories }: StoryCarouselProps) {
  const [[currentIndex, direction], setPage] = useState([0, 0]);

  const paginate = useCallback(
    (newDirection: number) => {
      setPage(([prev]) => {
        const next = prev + newDirection;
        if (next < 0 || next >= stories.length) return [prev, 0];
        return [next, newDirection];
      });
    },
    [stories.length],
  );

  const goTo = useCallback(
    (idx: number) => {
      setPage(([prev]) => [idx, idx > prev ? 1 : -1]);
    },
    [],
  );

  const { onTouchStart, onTouchEnd } = useSwipe({
    onSwipeLeft: () => paginate(1),
    onSwipeRight: () => paginate(-1),
    threshold: 40,
  });

  const story = stories[currentIndex];
  if (!story) return null;

  const cover = resolveCover(story.cover_image, story.id, story.topic);
  const sceneCount = story.scenes?.length || 0;

  return (
    <div
      className="flex flex-col items-center pt-2 pb-4"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Main Card */}
      <div className="relative w-full max-w-[300px]" style={{ aspectRatio: "3/4" }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={story.id}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <Link
              href={`/library/${story.id}`}
              className="block w-full h-full rounded-3xl overflow-hidden no-underline relative"
              style={{
                boxShadow: "0 20px 60px rgba(90,62,43,0.15), 0 4px 16px rgba(90,62,43,0.08)",
              }}
            >
              <img
                src={cover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
                draggable={false}
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-x-0 bottom-0 pt-24 pb-5 px-5 flex flex-col justify-end"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
                }}
              >
                <p className="font-serif text-xl text-white font-bold leading-tight drop-shadow-sm line-clamp-2">
                  {story.title || "나의 마음 동화"}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-white/70 text-xs font-light">
                    {sceneCount}장면
                  </span>
                  {story.is_public && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="text-white/70 text-xs font-light">공유됨</span>
                    </>
                  )}
                </div>
              </div>

              {/* mamastale watermark */}
              <span className="absolute top-3.5 right-4 text-white/25 text-[9px] font-light tracking-wider">
                mamastale
              </span>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Swipe hint */}
      {stories.length > 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-[10px] text-brown-pale/40 font-light mt-4 mb-2"
        >
          ← 스와이프해서 다른 동화 보기 →
        </motion.p>
      )}

      {/* Dot indicators */}
      {stories.length > 1 && (
        <div className="flex items-center gap-1.5 mt-1">
          {stories.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => goTo(idx)}
              aria-label={`${idx + 1}번째 동화: ${s.title}`}
              className="transition-all duration-300"
              style={{
                width: idx === currentIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background:
                  idx === currentIndex
                    ? "linear-gradient(135deg, #E07A5F, #C96B52)"
                    : "rgba(196,149,106,0.2)",
              }}
            />
          ))}
        </div>
      )}

      {/* "Read this one" CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-6 w-full max-w-[300px]"
      >
        <Link
          href={`/library/${story.id}`}
          className="flex items-center justify-center w-full py-3.5 rounded-full text-white text-[14px] font-medium no-underline transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          이 동화 읽기
        </Link>
      </motion.div>

      {/* Create new story link */}
      <Link
        href="/?action=start"
        className="mt-3 text-[12px] text-brown-pale font-light no-underline underline-offset-2 decoration-brown-pale/30 hover:underline min-h-[44px] inline-flex items-center"
      >
        + 새 동화 만들기
      </Link>
    </div>
  );
}
