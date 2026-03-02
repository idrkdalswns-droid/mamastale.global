"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDownloadButton } from "@/components/story/PDFDownloadButton";
import { useSwipe } from "@/lib/hooks/useSwipe";

import type { Scene } from "@/lib/types/story";

/** Page background colors — paired scenes share the same tone */
const pageBgClass: Record<number, string> = {
  0: "bg-[#EEF6F3]",
  1: "bg-[#FEF7ED]",
  2: "bg-[#F4EEF8]",
  3: "bg-[#FFF6EE]",
  4: "bg-[#FBF5EC]",
};

interface StoryViewerProps {
  scenes: Scene[];
  title?: string;
  authorName?: string;
  onBack?: () => void;
  onBackLabel?: string;
  onEdit?: () => void;
  embedded?: boolean;
}

export function StoryViewer({ scenes, title, authorName, onBack, onBackLabel, onEdit, embedded }: StoryViewerProps) {
  // ── Pagination: 2 scenes per page ──
  const totalPages = useMemo(() => Math.ceil((scenes?.length || 0) / 2), [scenes]);

  const pageStorageKey = title ? `mamastale_last_page_${title.slice(0, 40)}` : "";
  const [currentPage, setCurrentPage] = useState(() => {
    if (!pageStorageKey) return 0;
    try {
      const saved = parseInt(localStorage.getItem(pageStorageKey) || "0", 10);
      return saved >= 0 && saved < totalPages ? saved : 0;
    } catch { return 0; }
  });
  const [copied, setCopied] = useState(false);

  // Persist last read page
  useEffect(() => {
    if (pageStorageKey) {
      try { localStorage.setItem(pageStorageKey, String(currentPage)); } catch {}
    }
  }, [currentPage, pageStorageKey]);

  // Font size control (13/15/17/19/21px)
  const [fontSize, setFontSize] = useState(() => {
    try { return parseInt(localStorage.getItem("mamastale_font_size") || "15", 10); } catch { return 15; }
  });
  const adjustFont = useCallback((delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(13, Math.min(21, prev + delta));
      try { localStorage.setItem("mamastale_font_size", String(next)); } catch {}
      return next;
    });
  }, []);

  // Mother message (last page only)
  const motherMsgKey = title ? `mamastale_mother_msg_${title.slice(0, 40)}` : "mamastale_mother_message";
  const [motherMessage, setMotherMessage] = useState(() => {
    try { return localStorage.getItem(motherMsgKey) || ""; } catch { return ""; }
  });
  useEffect(() => {
    try {
      if (motherMessage) localStorage.setItem(motherMsgKey, motherMessage);
      else localStorage.removeItem(motherMsgKey);
    } catch {}
  }, [motherMessage, motherMsgKey]);

  // Guard: empty scenes
  if (!scenes || scenes.length === 0) {
    return (
      <div className={`${embedded ? "" : "min-h-dvh"} bg-cream flex flex-col items-center justify-center px-8 font-sans`}>
        <h2 className="font-serif text-xl text-brown font-bold mb-3">동화가 아직 준비되지 않았어요</h2>
        <p className="text-sm text-brown-light font-light text-center leading-relaxed mb-6 break-keep">
          동화 장면이 생성되지 않았습니다.<br />대화를 조금 더 이어가 주세요.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
            }}
          >
            {onBackLabel || "뒤로가기"}
          </button>
        )}
      </div>
    );
  }

  const isFirst = currentPage === 0;
  const isLast = currentPage === totalPages - 1;
  const storyTitle = title || "나의 마음 동화";

  // Get 2 scenes for the current page
  const pageScenes = useMemo(() => {
    const startIdx = currentPage * 2;
    return scenes.slice(startIdx, startIdx + 2);
  }, [scenes, currentPage]);

  // Swipe gestures
  const goNext = useCallback(() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);
  const goPrev = useCallback(() => setCurrentPage((p) => Math.max(0, p - 1)), []);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // Build full story text for copy/share
  const buildStoryText = useCallback(() => {
    const header = `${storyTitle}\n${authorName || "어머니"}\n`;

    const body = scenes
      .map((s) => `\n${s.text}\n`)
      .join("");

    const motherMsg = motherMessage.trim()
      ? `\n\n아이에게 전하는 한마디\n${motherMessage.trim()}\n`
      : "";

    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
    const footer = `\nmamastale에서 만든 세상에 하나뿐인 동화\n${siteUrl}`;

    return header + body + motherMsg + footer;
  }, [scenes, storyTitle, authorName, motherMessage]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildStoryText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = buildStoryText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [buildStoryText]);

  const handleShare = useCallback(async () => {
    const text = buildStoryText();
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
    if (navigator.share) {
      try {
        await navigator.share({ title: storyTitle, text, url: siteUrl });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  }, [buildStoryText, storyTitle, handleCopy]);

  const bgClass = pageBgClass[currentPage] || "bg-[#FBF5EC]";

  return (
    <div className={`${embedded ? "" : "min-h-dvh"} bg-cream flex flex-col font-sans`}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            {onBack && (
              <button onClick={onBack} className="text-sm text-brown-light min-h-[44px] flex items-center">
                {onBackLabel || "뒤로"}
              </button>
            )}
            <div className="text-center flex-1">
              <div
                className="text-[10px] text-brown-mid tracking-[2px] font-medium"
                role="status"
                aria-live="polite"
                aria-label={`${currentPage + 1} / ${totalPages} 페이지`}
              >
                {currentPage + 1} / {totalPages}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => adjustFont(-2)}
                className="w-11 h-11 rounded-full text-[10px] font-medium text-brown-pale active:scale-90 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                aria-label="글꼴 작게"
              >
                A-
              </button>
              <button
                onClick={() => adjustFont(2)}
                className="w-11 h-11 rounded-full text-[12px] font-medium text-brown-mid active:scale-90 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                aria-label="글꼴 크게"
              >
                A+
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="w-11 h-11 rounded-full text-[11px] text-brown-mid active:scale-90 transition-transform ml-1 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                  aria-label="동화 수정"
                >
                  수정
                </button>
              )}
            </div>
          </div>
          {/* Progress — 5 page segments */}
          <div className="flex gap-0.5 px-4 pb-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="flex-1 min-h-[44px] flex items-center cursor-pointer"
                aria-label={`${i + 1}페이지로 이동`}
              >
                <div
                  className="h-[6px] w-full rounded-full transition-all duration-300"
                  style={{
                    background: i <= currentPage ? "#E07A5F" : "rgba(0,0,0,0.06)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content — 2 scenes, swipeable */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          {...swipeHandlers}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`flex-1 flex flex-col px-6 py-8 ${bgClass} max-w-3xl mx-auto w-full`}
        >
          {/* Story title — shown on every page */}
          {isFirst && (
            <h1 className="font-serif text-xl text-brown font-bold mb-8 leading-tight text-center">
              {storyTitle}
            </h1>
          )}

          {/* Two scenes as two paragraphs */}
          <div className="space-y-8">
            {pageScenes.map((scene) => (
              <p
                key={scene.sceneNumber}
                className="font-serif text-brown leading-[2.4] break-keep whitespace-pre-wrap transition-all"
                style={{ fontSize }}
              >
                {scene.text}
              </p>
            ))}
          </div>

          {/* Last page extras */}
          {isLast && (
            <div className="mt-8 space-y-4">
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.12)" }}
              >
                <label className="block text-xs text-brown-mid font-medium mb-2">
                  아이에게 전하고 싶은 한마디 (선택)
                </label>
                <textarea
                  value={motherMessage}
                  onChange={(e) => setMotherMessage(e.target.value)}
                  placeholder="사랑하는 우리 아이에게..."
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-serif bg-white/70 border border-brown-pale/15 text-brown placeholder-brown-pale/50 outline-none resize-none leading-relaxed"
                  aria-label="아이에게 전하는 한마디"
                />
                <p className="text-[10px] text-brown-pale font-light text-right mt-1">
                  {motherMessage.length}/200
                </p>
              </div>

              {/* Self-care message */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(127,191,176,0.06)", border: "1px solid rgba(127,191,176,0.12)" }}
              >
                <p className="text-xs text-brown-light leading-6 font-normal break-keep">
                  오늘 많은 감정을 꺼내주셨어요.
                  <br />
                  따뜻한 차 한 잔, 좋아하는 음악, 짧은 산책 등
                  <br />
                  작은 돌봄의 시간을 가져보세요.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-black/[0.04]">
        <div className="max-w-3xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)]">
        {isLast ? (
          <div className="space-y-2.5">
            <div className="flex gap-2.5">
              <button
                onClick={handleShare}
                className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
                }}
              >
                공유하기
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: copied ? "rgba(127,191,176,0.15)" : "rgba(127,191,176,0.1)",
                  color: copied ? "#3D8B7A" : "#5A9E8F",
                  border: "1.5px solid rgba(127,191,176,0.3)",
                }}
              >
                {copied ? "복사됨" : "전체 복사"}
              </button>
            </div>
            <PDFDownloadButton scenes={scenes} title={storyTitle} authorName={authorName} />
            {onBack && onBackLabel && (
              <button
                onClick={onBack}
                className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #8B6AAF, #A084C4)",
                  boxShadow: "0 4px 16px rgba(139,106,175,0.3)",
                }}
              >
                {onBackLabel || "다음 단계"}
              </button>
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
            >
              이전 페이지
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={isFirst}
              className="flex-1 py-3.5 rounded-full text-sm font-medium transition-all"
              style={{
                border: "1.5px solid rgba(196,149,106,0.25)",
                color: isFirst ? "#D0C8C0" : "#8B6F55",
                background: "transparent",
              }}
            >
              이전 페이지
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
              }}
            >
              다음 페이지
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
