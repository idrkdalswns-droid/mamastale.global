"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface PopupBookViewerProps {
  images: string[];
  imageOrder: number[];
  texts: Record<number, string>;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTextChange?: (imageIndex: number, text: string) => void;
  accent: string;
  editable?: boolean;
  storyTitle?: string;
}

const SWIPE_THRESHOLD = 50;
const MAX_TEXT_LENGTH = 200;

export function PopupBookViewer({
  images,
  imageOrder,
  texts,
  currentPage,
  onPageChange,
  onTextChange,
  accent,
  editable = true,
  storyTitle,
}: PopupBookViewerProps) {
  const [direction, setDirection] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const totalPages = imageOrder.length;
  const currentImageIndex = imageOrder[currentPage];
  const currentText = texts[currentImageIndex] || "";

  const goToPage = useCallback(
    (page: number, dir: number) => {
      if (page < 0 || page >= totalPages) return;
      setDirection(dir);
      onPageChange(page);
    },
    [totalPages, onPageChange],
  );

  function handlePointerDown(e: React.PointerEvent) {
    if (isEditing) return;
    pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!pointerRef.current || isEditing) return;
    const dx = e.clientX - pointerRef.current.x;
    const dy = e.clientY - pointerRef.current.y;
    const dt = Date.now() - pointerRef.current.t;
    pointerRef.current = null;

    // Horizontal > vertical, min 40px, within 500ms
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40 && dt < 500) {
      if (dx < 0 && currentPage < totalPages - 1) goToPage(currentPage + 1, 1);
      else if (dx > 0 && currentPage > 0) goToPage(currentPage - 1, -1);
    }
  }

  const handleTextSubmit = useCallback(() => {
    setIsEditing(false);
    textareaRef.current?.blur();
  }, []);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Keyboard handling: scrollIntoView when virtual keyboard opens
  useEffect(() => {
    if (!isEditing) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, [isEditing]);

  // Keyboard navigation (← →)
  useEffect(() => {
    if (isEditing) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 0) {
        goToPage(currentPage - 1, -1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages - 1) {
        goToPage(currentPage + 1, 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isEditing, currentPage, totalPages, goToPage]);

  // Auto-scroll thumbnail strip to current page
  useEffect(() => {
    if (!stripRef.current) return;
    const thumbEl = stripRef.current.children[currentPage] as HTMLElement | undefined;
    if (thumbEl) {
      thumbEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentPage]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, window.innerHeight * 0.3)}px`;
    }
  }, [isEditing, currentText]);

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? "100%" : "-100%",
      rotateY: d > 0 ? -15 : 15,
      opacity: 0,
    }),
    center: {
      x: 0,
      rotateY: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? "-100%" : "100%",
      rotateY: d > 0 ? 15 : -15,
      opacity: 0,
    }),
  };

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      {/* Book area — flex-1 min-h-0 for proper sizing */}
      <div
        className="flex-1 min-h-0 relative mx-4 rounded-2xl overflow-hidden"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d",
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              rotateY: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{
              touchAction: "pan-y",
              transformStyle: "preserve-3d",
              boxShadow: `0 8px 32px ${accent}20, 0 2px 8px rgba(0,0,0,0.08)`,
            }}
          >
            {/* Background image — object-contain to show full illustration */}
            <Image
              src={images[currentImageIndex]}
              alt={`${storyTitle ?? ""} 장면 ${currentPage + 1}`}
              fill
              className="object-contain select-none"
              sizes="(max-width: 430px) 100vw, 400px"
              draggable={false}
              priority={currentPage < 2}
            />

            {/* Book spine shadow (left edge) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-3"
              style={{
                background: "linear-gradient(to right, rgba(0,0,0,0.15), transparent)",
              }}
            />

            {/* Text overlay area — bottom glassmorphism */}
            <div
              className="absolute bottom-0 inset-x-0 p-4"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                maxHeight: "40%",
              }}
            >
              {/* Page badge + char counter */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="inline-block px-2 py-0.5 rounded-full text-[9px] font-medium text-white/80"
                  style={{
                    background: `${accent}60`,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {currentPage + 1}p
                </div>
                {editable && (
                  <span className="text-[9px] text-white/50 font-light">
                    {currentText.length}/{MAX_TEXT_LENGTH}
                  </span>
                )}
              </div>

              {editable ? (
                isEditing ? (
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={currentText}
                      onChange={(e) => onTextChange?.(currentImageIndex, e.target.value)}
                      onBlur={handleTextSubmit}
                      placeholder="이 장면의 이야기를 써주세요..."
                      maxLength={MAX_TEXT_LENGTH}
                      className="w-full bg-white/15 backdrop-blur-md text-white text-[14px] font-serif leading-relaxed rounded-xl px-3 py-2.5 resize-none outline-none placeholder:text-white/40"
                      style={{
                        border: `1px solid ${accent}40`,
                        maxHeight: "30dvh",
                      }}
                    />
                    <button
                      onClick={handleTextSubmit}
                      className="mt-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium text-white float-right"
                      style={{ background: accent }}
                    >
                      완료
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full text-left"
                  >
                    {currentText ? (
                      <p className="text-white text-[14px] font-serif leading-relaxed whitespace-pre-line drop-shadow-sm">
                        {currentText}
                      </p>
                    ) : (
                      <p
                        className="text-white/50 text-[13px] font-light italic py-2 px-3 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          backdropFilter: "blur(8px)",
                          border: "1px dashed rgba(255,255,255,0.2)",
                        }}
                      >
                        탭하여 이야기를 써주세요...
                      </p>
                    )}
                  </button>
                )
              ) : (
                currentText && (
                  <p className="text-white text-[14px] font-serif leading-relaxed whitespace-pre-line drop-shadow-sm">
                    {currentText}
                  </p>
                )
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail strip */}
      <div className="pt-3 pb-2 px-2">
        <div
          ref={stripRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 px-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {imageOrder.map((idx, i) => {
            const isActive = i === currentPage;
            return (
              <button
                key={`thumb-${idx}`}
                onClick={() => goToPage(i, i > currentPage ? 1 : -1)}
                className="shrink-0 relative rounded-lg overflow-hidden transition-transform duration-200 focus:outline-none"
                style={{
                  width: 44,
                  height: 58,
                  scrollSnapAlign: "center",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  border: isActive ? `2px solid ${accent}` : "2px solid transparent",
                }}
                aria-label={`${i + 1}번째 장면으로 이동`}
              >
                <Image
                  src={images[idx]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                  draggable={false}
                />
                {/* Page number overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[9px] font-bold text-white drop-shadow-md"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                  >
                    {i + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prefetch adjacent images */}
      {[-1, 1].map((offset) => {
        const p = currentPage + offset;
        if (p < 0 || p >= totalPages) return null;
        return (
          <link
            key={`prefetch-${offset}`}
            rel="prefetch"
            href={images[imageOrder[p]]}
          />
        );
      })}
    </div>
  );
}
