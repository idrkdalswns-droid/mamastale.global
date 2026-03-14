"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

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

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (isEditing) return;
      if (info.offset.x < -SWIPE_THRESHOLD && currentPage < totalPages - 1) {
        goToPage(currentPage + 1, 1);
      } else if (info.offset.x > SWIPE_THRESHOLD && currentPage > 0) {
        goToPage(currentPage - 1, -1);
      }
    },
    [currentPage, totalPages, goToPage, isEditing],
  );

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

  // #7: Keyboard navigation (← →)
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
    <div className="flex flex-col h-full">
      {/* Page counter */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <button
          onClick={() => goToPage(currentPage - 1, -1)}
          disabled={currentPage === 0}
          aria-label="이전 장면"
          className="text-[12px] text-brown-light disabled:opacity-20 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ← 이전
        </button>
        <span className="text-[11px] text-brown-pale font-light">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1, 1)}
          disabled={currentPage === totalPages - 1}
          aria-label="다음 장면"
          className="text-[12px] text-brown-light disabled:opacity-20 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          다음 →
        </button>
      </div>

      {/* 3D Book area */}
      <div
        className="flex-1 relative mx-4 rounded-2xl overflow-hidden"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d",
          minHeight: "360px",
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
            drag={isEditing ? false : "x"}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              boxShadow: `0 8px 32px ${accent}20, 0 2px 8px rgba(0,0,0,0.08)`,
            }}
          >
            {/* Background image */}
            <Image
              src={images[currentImageIndex]}
              alt={`${storyTitle ?? ''} 장면 ${currentPage + 1}`}
              fill
              className="object-cover select-none"
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
              }}
            >
              {/* Page number badge */}
              <div
                className="inline-block px-2 py-0.5 rounded-full text-[9px] font-medium text-white/80 mb-2"
                style={{
                  background: `${accent}60`,
                  backdropFilter: "blur(8px)",
                }}
              >
                {currentPage + 1}p
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
                      maxLength={200}
                      rows={3}
                      className="w-full bg-white/15 backdrop-blur-md text-white text-[14px] font-serif leading-relaxed rounded-xl px-3 py-2.5 resize-none outline-none placeholder:text-white/40"
                      style={{ border: `1px solid ${accent}40` }}
                    />
                    <button
                      onClick={handleTextSubmit}
                      className="absolute bottom-2 right-2 px-3 py-1 rounded-full text-[10px] font-medium text-white"
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

        {/* Page dots */}
        <div className="absolute bottom-[-28px] left-0 right-0 flex justify-center gap-1.5">
          {imageOrder.map((_, i) => {
            const distance = Math.abs(i - currentPage);
            const scale = distance === 0 ? 1 : distance <= 2 ? 0.7 : 0.4;
            return (
              <button
                key={i}
                onClick={() => goToPage(i, i > currentPage ? 1 : -1)}
                className="p-0.5"
                aria-label={`${i + 1}번째 장면으로 이동`}
              >
                <div
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === currentPage ? 16 : Math.max(3, 5 * scale),
                    height: Math.max(3, 5 * scale),
                    background: i === currentPage ? accent : `${accent}40`,
                    opacity: distance <= 2 || i === 0 || i === totalPages - 1 ? 1 : 0.3,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom padding for dots */}
      <div className="h-10" />
    </div>
  );
}
