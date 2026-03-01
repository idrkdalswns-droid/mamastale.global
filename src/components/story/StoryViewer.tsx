"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDownloadButton } from "@/components/story/PDFDownloadButton";
import { useSwipe } from "@/lib/hooks/useSwipe";

const MOTHER_MSG_KEY = "mamastale_mother_message";
import type { Scene } from "@/lib/types/story";

const sceneStructure: Record<number, { label: string; emoji: string; bgClass: string }> = {
  1: { label: "도입", emoji: "🌅", bgClass: "bg-[#EEF6F3]" },
  2: { label: "도입", emoji: "🌅", bgClass: "bg-[#EEF6F3]" },
  3: { label: "갈등", emoji: "🌊", bgClass: "bg-[#FEF7ED]" },
  4: { label: "갈등", emoji: "🌊", bgClass: "bg-[#FEF7ED]" },
  5: { label: "시도", emoji: "🌱", bgClass: "bg-[#F4EEF8]" },
  6: { label: "시도", emoji: "🌱", bgClass: "bg-[#F4EEF8]" },
  7: { label: "해결", emoji: "☀️", bgClass: "bg-[#FFF6EE]" },
  8: { label: "해결", emoji: "☀️", bgClass: "bg-[#FFF6EE]" },
  9: { label: "교훈", emoji: "💛", bgClass: "bg-[#FBF5EC]" },
  10: { label: "교훈", emoji: "💛", bgClass: "bg-[#FBF5EC]" },
};

interface StoryViewerProps {
  scenes: Scene[];
  title?: string;
  authorName?: string;
  onBack?: () => void;
  onBackLabel?: string; // custom label for the back button (e.g. "피드백 남기기")
  onEdit?: () => void; // FR-007: show edit button in header
  embedded?: boolean; // true when used inside another page (no min-h-dvh)
}

export function StoryViewer({ scenes, title, authorName, onBack, onBackLabel, onEdit, embedded }: StoryViewerProps) {
  const sceneStorageKey = title ? `mamastale_last_scene_${title.slice(0, 40)}` : "";
  const [currentScene, setCurrentScene] = useState(() => {
    if (!sceneStorageKey) return 0;
    try {
      const saved = parseInt(localStorage.getItem(sceneStorageKey) || "0", 10);
      return saved >= 0 && saved < (scenes?.length || 1) ? saved : 0;
    } catch { return 0; }
  });
  const [copied, setCopied] = useState(false);

  // FR-009: Persist last read scene
  useEffect(() => {
    if (sceneStorageKey) {
      try { localStorage.setItem(sceneStorageKey, String(currentScene)); } catch {}
    }
  }, [currentScene, sceneStorageKey]);

  // FR-006: Font size control (13/15/17/19px)
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

  const [motherMessage, setMotherMessage] = useState(() => {
    try { return localStorage.getItem(MOTHER_MSG_KEY) || ""; } catch { return ""; }
  });

  // Persist mother message to localStorage
  useEffect(() => {
    try {
      if (motherMessage) localStorage.setItem(MOTHER_MSG_KEY, motherMessage);
      else localStorage.removeItem(MOTHER_MSG_KEY);
    } catch {}
  }, [motherMessage]);

  // Guard: empty scenes array — show friendly empty state instead of crashing
  if (!scenes || scenes.length === 0) {
    return (
      <div className={`${embedded ? "" : "min-h-dvh"} bg-cream flex flex-col items-center justify-center px-8 font-sans`}>
        <div className="text-5xl mb-4">📖</div>
        <h2 className="font-serif text-xl text-brown font-bold mb-3">동화가 아직 준비되지 않았어요</h2>
        <p className="text-sm text-brown-light font-light text-center leading-relaxed mb-6 break-keep">
          동화 장면이 생성되지 않았습니다.<br />대화를 조금 더 이어가 주세요.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
            }}
          >
            {onBackLabel || "← 뒤로가기"}
          </button>
        )}
      </div>
    );
  }

  const scene = scenes[currentScene];
  const info = sceneStructure[scene?.sceneNumber] || { label: "", emoji: "📖", bgClass: "bg-cream" };
  const isFirst = currentScene === 0;
  const isLast = currentScene === scenes.length - 1;
  const storyTitle = title || "나의 치유 동화";

  // FR-001: Swipe gestures for scene navigation
  const goNext = useCallback(() => setCurrentScene((p) => Math.min(scenes.length - 1, p + 1)), [scenes.length]);
  const goPrev = useCallback(() => setCurrentScene((p) => Math.max(0, p - 1)), []);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // Build full story text for copy/share — 깔끔한 페이지 형식
  const buildStoryText = useCallback(() => {
    const header = `${storyTitle}\n글 · ${authorName || "어머니"}\n`;

    const body = scenes
      .map((s, i) => `\n${i + 1} 페이지\n\n${s.text}\n`)
      .join("\n");

    const motherMsg = motherMessage.trim()
      ? `\n\n💌 아이에게 전하는 한마디\n${motherMessage.trim()}\n`
      : "";

    // KR-T3: Use dynamic origin instead of hardcoded URL
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
      // Fallback for older browsers
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: storyTitle,
          text,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy instead
      handleCopy();
    }
  }, [buildStoryText, storyTitle, handleCopy]);

  return (
    <div className={`${embedded ? "" : "min-h-dvh"} bg-cream flex flex-col font-sans`}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            {onBack && (
              <button onClick={onBack} className="text-sm text-brown-light min-h-[44px] flex items-center">
                {onBackLabel || "← 뒤로"}
              </button>
            )}
            <div className="text-center flex-1">
              <div
                className="text-[10px] text-brown-mid tracking-[2px] font-medium"
                role="status"
                aria-live="polite"
                aria-label={`장면 ${currentScene + 1} / ${scenes.length}`}
              >
                {currentScene + 1} / {scenes.length}
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
                  ✏️
                </button>
              )}
            </div>
          </div>
          {/* Progress — tappable to jump between scenes */}
          <div className="flex gap-0.5 px-4 pb-2">
            {scenes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentScene(i)}
                className="flex-1 min-h-[44px] flex items-center cursor-pointer"
                aria-label={`장면 ${i + 1}로 이동`}
              >
                <div
                  className="h-[6px] w-full rounded-full transition-all duration-300"
                  style={{
                    background: i <= currentScene ? "#E07A5F" : "rgba(0,0,0,0.06)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scene Content — swipeable */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          {...swipeHandlers}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`flex-1 flex flex-col px-6 py-8 ${info.bgClass} max-w-3xl mx-auto w-full`}
        >
          <div className="mb-6">
            <span className="text-3xl">{info.emoji}</span>
          </div>

          <div className="text-[10px] text-brown-mid tracking-[2px] font-medium mb-2">
            장면 {String(scene.sceneNumber).padStart(2, "0")} · {info.label}
          </div>

          <h2 className="font-serif text-xl text-brown font-bold mb-6 leading-tight">
            {scene.title}
          </h2>

          <p
            className="font-serif text-brown leading-[2.4] break-keep whitespace-pre-wrap transition-all"
            style={{ fontSize }}
          >
            {scene.text}
          </p>

          {/* "아이에게 전하는 한마디" — only on the last scene */}
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
                <p className="text-xs text-brown-light leading-6 font-light break-keep">
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
            {/* Share & Copy actions */}
            <div className="flex gap-2.5">
              <button
                onClick={handleShare}
                className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                  boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
                }}
              >
                📤 공유하기
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
                {copied ? "✓ 복사됨 · 붙여넣기 해보세요" : "📋 전체 복사"}
              </button>
            </div>
            {/* PDF Download */}
            <PDFDownloadButton scenes={scenes} title={storyTitle} authorName={authorName} />
            {/* Continue to next step — only in main flow where onBackLabel is set */}
            {onBack && onBackLabel && (
              <button
                onClick={onBack}
                className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #8B6AAF, #A084C4)",
                  boxShadow: "0 4px 16px rgba(139,106,175,0.3)",
                }}
              >
                {onBackLabel || "다음 단계 →"}
              </button>
            )}
            {/* Back to previous scene */}
            <button
              onClick={() => setCurrentScene((p) => Math.max(0, p - 1))}
              className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
            >
              ← 이전 장면
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentScene((p) => Math.max(0, p - 1))}
              disabled={isFirst}
              className="flex-1 py-3.5 rounded-full text-sm font-medium transition-all"
              style={{
                border: "1.5px solid rgba(196,149,106,0.25)",
                color: isFirst ? "#D0C8C0" : "#8B6F55",
                background: "transparent",
              }}
            >
              ← 이전 장면
            </button>
            <button
              onClick={() => setCurrentScene((p) => Math.min(scenes.length - 1, p + 1))}
              className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
              }}
            >
              다음 장면 →
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
