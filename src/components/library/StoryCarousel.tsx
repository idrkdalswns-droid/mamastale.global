"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveCover } from "@/lib/utils/default-cover";
import type { Scene } from "@/lib/types/story";

interface StoryItem {
  id: string;
  title: string;
  scenes: Scene[];
  status: string;
  is_public?: boolean;
  is_unlocked?: boolean;
  cover_image?: string;
  topic?: string;
  created_at: string;
}

interface StoryCarouselProps {
  stories: StoryItem[];
}

export default function StoryCarousel({ stories }: StoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // ── IntersectionObserver로 중앙 카드 감지 ──
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || stories.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 가장 높은 intersectionRatio를 가진 카드를 active로
        let bestIdx = activeIndex;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute("data-idx"));
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        });
        if (bestRatio > 0.5) {
          setActiveIndex(bestIdx);
        }
      },
      {
        root: container,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardRefs는 ref이므로 deps 불필요
  }, [stories.length]);

  // ── 키보드 접근성 (ArrowLeft/Right) ──
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || stories.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const cardWidth = container.firstElementChild
          ? (container.firstElementChild as HTMLElement).offsetWidth
          : 280;
        const gap = 16;
        const scrollAmount = cardWidth + gap;
        container.scrollBy({
          left: e.key === "ArrowRight" ? scrollAmount : -scrollAmount,
          behavior: "smooth",
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stories.length]);

  // ── 도트 클릭 → 해당 카드로 스크롤 ──
  const scrollToIndex = useCallback((idx: number) => {
    const el = cardRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  const story = stories[activeIndex];
  if (!story) return null;

  return (
    <div className="flex flex-col items-center pt-2 pb-4">
      {/* ── Scroll Container ── */}
      <div
        ref={scrollRef}
        className="flex gap-4 w-full px-[10%] pb-2 overflow-x-auto"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {stories.map((s, idx) => {
          const cover = resolveCover(s.cover_image, s.id, s.topic);
          const sceneCount = s.scenes?.length || 0;
          const isActive = idx === activeIndex;

          return (
            <div
              key={s.id}
              ref={(el) => { cardRefs.current[idx] = el; }}
              data-idx={idx}
              className="flex-shrink-0 transition-all duration-300"
              style={{
                width: "80%",
                scrollSnapAlign: "center",
                transform: isActive ? "scale(1)" : "scale(0.93)",
                opacity: isActive ? 1 : 0.6,
              }}
            >
              <Link
                href={`/library/${s.id}`}
                className="block w-full rounded-3xl overflow-hidden no-underline relative"
                style={{
                  aspectRatio: "3/4",
                  boxShadow: isActive
                    ? "0 20px 60px rgba(90,62,43,0.15), 0 4px 16px rgba(90,62,43,0.08)"
                    : "0 8px 24px rgba(90,62,43,0.08)",
                }}
              >
                <Image
                  src={cover}
                  alt={s.title || "동화 표지"}
                  fill
                  className="object-cover object-center"
                  sizes="80vw"
                  draggable={false}
                  priority={idx === 0}
                  loading={idx === 0 ? "eager" : "lazy"}
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
                    {s.title || "나의 마음 동화"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-white/70 text-xs font-light">
                      {sceneCount}장면
                    </span>
                    {s.is_public && (
                      <>
                        <span className="text-white/40">·</span>
                        <span className="text-white/70 text-xs font-light">공유됨</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Freemium v2: Lock badge for locked stories */}
                {s.is_unlocked === false && (
                  <span
                    className="absolute top-3.5 left-4 px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}
                  >
                    미리보기
                  </span>
                )}

                {/* mamastale watermark */}
                <span className="absolute top-3.5 right-4 text-white/25 text-[9px] font-light tracking-wider">
                  mamastale
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* ── Dot indicators ── */}
      {stories.length > 1 && (
        <div className="flex items-center gap-0.5 mt-3" role="tablist" aria-label="동화 목록">
          {stories.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => scrollToIndex(idx)}
              role="tab"
              aria-selected={idx === activeIndex}
              aria-label={`${idx + 1}번째 동화: ${s.title}`}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] transition-all duration-300"
            >
              <span
                className="block rounded-full transition-all duration-300"
                style={{
                  width: idx === activeIndex ? 20 : 6,
                  height: 6,
                  background:
                    idx === activeIndex
                      ? "linear-gradient(135deg, #E07A5F, #C96B52)"
                      : "rgba(196,149,106,0.2)",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── "이 동화 읽기" CTA ── */}
      <div className="mt-5 w-full max-w-[300px]">
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
      </div>

      {/* ── 새 동화 만들기 ── */}
      <Link
        href="/?action=start"
        className="mt-3 text-[12px] text-brown-pale font-light no-underline underline-offset-2 decoration-brown-pale/30 hover:underline min-h-[44px] inline-flex items-center"
      >
        + 새 동화 만들기
      </Link>
    </div>
  );
}
