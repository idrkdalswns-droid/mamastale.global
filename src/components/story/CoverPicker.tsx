"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// ─── Cover image catalogue ───
import { CATEGORY_COVERS, type CoverCategory } from "@/lib/utils/default-cover";

type CoverFilter = "all" | "pink" | "green" | "blue" | CoverCategory;

interface CoverImage {
  path: string;
  filter: CoverFilter;
}

const FILTER_LABELS: Record<CoverFilter, string> = {
  all: "전체",
  animal: "동물 가족",
  child: "아이 모험",
  nature: "자연",
  fantasy: "판타지",
  warm: "감성",
  pink: "따뜻한 위로",
  green: "고요한 성장",
  blue: "꿈꾸는 밤",
  style: "아트 스타일",
};

const FILTER_STYLES: Record<string, { bgActive: string; textActive: string; border: string }> = {
  animal: { bgActive: "rgba(196,149,106,0.12)", textActive: "#8B6F55", border: "rgba(196,149,106,0.2)" },
  child: { bgActive: "rgba(122,155,181,0.12)", textActive: "#5A7A94", border: "rgba(122,155,181,0.2)" },
  nature: { bgActive: "rgba(168,191,168,0.14)", textActive: "#6B8F6B", border: "rgba(168,191,168,0.2)" },
  fantasy: { bgActive: "rgba(139,106,175,0.12)", textActive: "#6D4AAF", border: "rgba(139,106,175,0.2)" },
  warm: { bgActive: "rgba(224,122,95,0.12)", textActive: "#C96B52", border: "rgba(224,122,95,0.18)" },
  pink: { bgActive: "rgba(224,122,95,0.12)", textActive: "#C96B52", border: "rgba(224,122,95,0.18)" },
  green: { bgActive: "rgba(168,191,168,0.14)", textActive: "#6B8F6B", border: "rgba(168,191,168,0.2)" },
  blue: { bgActive: "rgba(122,155,181,0.12)", textActive: "#5A7A94", border: "rgba(122,155,181,0.2)" },
  style: { bgActive: "rgba(196,149,106,0.12)", textActive: "#8B6F55", border: "rgba(196,149,106,0.2)" },
};

// Build cover images from all sources
const COVER_IMAGES: CoverImage[] = [
  // New category covers first (more visually interesting)
  ...Object.entries(CATEGORY_COVERS).flatMap(([cat, paths]) =>
    paths.map(path => ({ path, filter: cat as CoverFilter }))
  ),
  // Classic Pink (01–16) .png
  ...Array.from({ length: 16 }, (_, i) => ({
    path: `/images/covers/cover_pink${String(i + 1).padStart(2, "0")}.png`,
    filter: "pink" as CoverFilter,
  })),
  // Classic Green (01–14) .jpeg
  ...Array.from({ length: 14 }, (_, i) => ({
    path: `/images/covers/cover_green${String(i + 1).padStart(2, "0")}.jpeg`,
    filter: "green" as CoverFilter,
  })),
  // Classic Blue (00–14) .jpeg
  ...Array.from({ length: 15 }, (_, i) => ({
    path: `/images/covers/cover_blue${String(i).padStart(2, "0")}.jpeg`,
    filter: "blue" as CoverFilter,
  })),
];

const FILTER_ORDER: CoverFilter[] = ["animal", "child", "nature", "fantasy", "warm", "pink", "green", "blue", "style"];

// ─── Props ───

interface CoverPickerProps {
  storyTitle: string;
  authorName?: string;
  onSelect: (coverPath: string) => void;
  onSkip: () => void;
}

// ─── Component ───

export function CoverPicker({ storyTitle, authorName, onSelect, onSkip }: CoverPickerProps) {
  // Random initial image
  const [selected, setSelected] = useState<CoverImage>(() => {
    const idx = Math.floor(Math.random() * COVER_IMAGES.length);
    return COVER_IMAGES[idx];
  });
  const [activeFilter, setActiveFilter] = useState<CoverFilter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Filter images by active filter
  const filteredImages = useMemo(
    () => (activeFilter ? COVER_IMAGES.filter((c) => c.filter === activeFilter) : COVER_IMAGES),
    [activeFilter],
  );

  // Scroll selected thumbnail into view
  const scrollToSelected = useCallback(
    (path: string) => {
      if (!thumbnailRef.current) return;
      const el = thumbnailRef.current.querySelector(`[data-path="${CSS.escape(path)}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    },
    [],
  );

  const handleSelect = useCallback(
    (img: CoverImage) => {
      setSelected(img);
      scrollToSelected(img.path);
    },
    [scrollToSelected],
  );

  const handleFilterToggle = useCallback(
    (filter: CoverFilter) => {
      setActiveFilter((prev) => (prev === filter ? null : filter));
    },
    [],
  );

  // On filter change, if selected not in filtered, auto-select first of new filter
  useEffect(() => {
    if (activeFilter && selected.filter !== activeFilter) {
      const first = COVER_IMAGES.find((c) => c.filter === activeFilter);
      if (first) {
        setSelected(first);
        const timer = setTimeout(() => scrollToSelected(first.path), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activeFilter, selected.filter, scrollToSelected]);

  const author = authorName || "어머니";

  return (
    <div className="min-h-dvh bg-cream flex flex-col font-sans relative overflow-hidden">
      {/* ── Zone A: Header ── */}
      <motion.div
        className="text-center pt-[calc(env(safe-area-inset-top,0px)+28px)] px-6 pb-2 relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Skip button — top right */}
        <button
          onClick={onSkip}
          className="absolute top-[calc(env(safe-area-inset-top,0px)+16px)] right-5 text-[11px] text-brown-pale font-light min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          건너뛰기
        </button>

        <h2 className="font-serif text-xl font-bold text-brown tracking-tight leading-tight">
          동화의 표지를 골라주세요
        </h2>
        <motion.p
          className="text-[13px] text-brown-light font-light mt-1.5 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          당신의 이야기에 어울리는 분위기를 찾아보세요
        </motion.p>
      </motion.div>

      {/* ── Zone B: Main Preview Card ── */}
      <motion.div
        className="flex-shrink-0 flex justify-center px-6 py-5"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative w-full max-w-[340px] rounded-2xl overflow-hidden"
          style={{
            aspectRatio: "16 / 10",
            boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={selected.path}
              src={selected.path}
              alt="표지 미리보기"
              className="absolute inset-0 w-full h-full object-cover object-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              draggable={false}
              onError={() => {
                // M-4: Auto-fallback to next image on load failure
                const idx = filteredImages.findIndex((c) => c.path === selected.path);
                const next = filteredImages[(idx + 1) % filteredImages.length];
                if (next && next.path !== selected.path) setSelected(next);
              }}
            />
          </AnimatePresence>

          {/* Title overlay — bottom gradient */}
          <div
            className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-16 flex flex-col justify-end"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)",
            }}
          >
            <p className="font-serif text-lg text-white font-bold leading-tight drop-shadow-sm">
              {storyTitle}
            </p>
            <p className="text-white/80 text-xs font-light mt-0.5">
              글 · {author}
            </p>
          </div>

          {/* Watermark */}
          <span className="absolute bottom-2.5 right-3.5 text-white/30 text-[9px] font-light tracking-wider">
            mamastale
          </span>
        </div>
      </motion.div>

      {/* ── Zone B2: Category Filter Chips ── */}
      <motion.div
        className="px-4 pb-4 overflow-x-auto"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex gap-1.5 justify-start w-max mx-auto">
          <button
            onClick={() => setActiveFilter(null)}
            aria-pressed={activeFilter === null}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.95] whitespace-nowrap"
            style={{
              background: activeFilter === null ? "rgba(196,149,106,0.12)" : "transparent",
              color: activeFilter === null ? "#8B6F55" : "rgba(139,111,85,0.45)",
              border: `1.5px solid ${activeFilter === null ? "rgba(196,149,106,0.25)" : "rgba(196,149,106,0.12)"}`,
            }}
          >
            전체
          </button>
          {FILTER_ORDER.map((filter) => {
            const isActive = activeFilter === filter;
            const style = FILTER_STYLES[filter];
            return (
              <button
                key={filter}
                onClick={() => handleFilterToggle(filter)}
                aria-pressed={isActive}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.95] whitespace-nowrap"
                style={{
                  background: isActive ? style.bgActive : "transparent",
                  color: isActive ? style.textActive : "rgba(139,111,85,0.45)",
                  border: `1.5px solid ${isActive ? style.border : "rgba(196,149,106,0.12)"}`,
                }}
              >
                {FILTER_LABELS[filter]}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Zone C: Thumbnail Carousel ── */}
      <motion.div
        className="px-2 pb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <div
          ref={thumbnailRef}
          className="flex gap-2.5 overflow-x-auto px-4 py-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {filteredImages.map((img) => {
            const isSelected = img.path === selected.path;
            return (
              <motion.button
                key={img.path}
                data-path={img.path}
                onClick={() => handleSelect(img)}
                className="flex-shrink-0 relative rounded-xl overflow-hidden snap-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                style={{
                  width: 88,
                  height: 55,
                  opacity: isSelected ? 1 : 0.7,
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  boxShadow: isSelected ? "0 0 0 3px #E07A5F" : "none",
                }}
                whileTap={{ scale: 0.95 }}
                aria-current={isSelected ? "true" : undefined}
              >
                <Image
                  src={img.path}
                  alt={`${FILTER_LABELS[img.filter]} 표지`}
                  width={88}
                  height={55}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                  draggable={false}
                />
                {isSelected && (
                  <div
                    className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "#E07A5F" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        <p className="text-[10px] text-brown-light/70 font-light text-center mt-1.5">
          ← 스와이프해서 더 보기 →
        </p>
      </motion.div>

      {/* ── CTA Area ── */}
      <motion.div
        className="mt-auto px-6 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <button
          onClick={() => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            onSelect(selected.path);
          }}
          disabled={isSubmitting}
          className="w-full py-4 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
          }}
        >
          {isSubmitting ? "저장하는 중..." : "이 표지로 결정"}
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 mt-1.5 text-[11px] text-brown-pale font-light transition-all min-h-[44px]"
        >
          표지 없이 진행하기
        </button>
      </motion.div>
    </div>
  );
}
