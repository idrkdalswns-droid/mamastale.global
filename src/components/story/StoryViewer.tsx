"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  embedded?: boolean; // true when used inside another page (no min-h-dvh)
}

export function StoryViewer({ scenes, title, authorName, onBack, embedded }: StoryViewerProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [copied, setCopied] = useState(false);

  const scene = scenes[currentScene];
  const info = sceneStructure[scene?.sceneNumber] || { label: "", emoji: "📖", bgClass: "bg-cream" };
  const isFirst = currentScene === 0;
  const isLast = currentScene === scenes.length - 1;
  const storyTitle = title || "나의 치유 동화";

  // Build full story text for copy/share — 동화 대본 형식
  const buildStoryText = useCallback(() => {
    const divider = "─".repeat(32);
    const thinDivider = "- ".repeat(16);

    const header = [
      divider,
      "",
      `  ${storyTitle}`,
      "",
      `  글 · ${authorName || "어머니"}`,
      "",
      divider,
    ].join("\n");

    const body = scenes
      .map((s) => {
        const si = sceneStructure[s.sceneNumber];
        const label = si?.label || "";
        return [
          "",
          `  제 ${s.sceneNumber} 장  ${label}`,
          `  ${thinDivider.trim()}`,
          `  ${s.title}`,
          "",
          s.text
            .split("\n")
            .map((line) => `  ${line}`)
            .join("\n"),
          "",
        ].join("\n");
      })
      .join("\n");

    const footer = [
      divider,
      "",
      "  mamastale에서 만든 세상에 하나뿐인 동화",
      "  https://mamastale-global.pages.dev",
      "",
      divider,
    ].join("\n");

    return header + "\n" + body + "\n" + footer;
  }, [scenes, storyTitle, authorName]);

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
        <div className="flex items-center justify-between px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="text-sm text-brown-light">
              ← 뒤로
            </button>
          )}
          <div className="text-center flex-1">
            <div className="text-[10px] text-brown-mid tracking-[2px] font-medium">
              {currentScene + 1} / {scenes.length}
            </div>
          </div>
          <div className="w-12" />
        </div>
        {/* Progress */}
        <div className="flex gap-0.5 px-4 pb-2">
          {scenes.map((_, i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full transition-all duration-300"
              style={{
                background: i <= currentScene ? "#E07A5F" : "rgba(0,0,0,0.06)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Scene Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`flex-1 flex flex-col px-6 py-8 ${info.bgClass}`}
        >
          <div className="mb-6">
            <span className="text-3xl">{info.emoji}</span>
          </div>

          <div className="text-[10px] text-brown-mid tracking-[2px] font-medium mb-2">
            SCENE {String(scene.sceneNumber).padStart(2, "0")} · {info.label}
          </div>

          <h2 className="font-serif text-xl text-brown font-bold mb-6 leading-tight">
            {scene.title}
          </h2>

          <p className="font-serif text-[15px] text-brown leading-[2.4] break-keep whitespace-pre-wrap">
            {scene.text}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-black/[0.04] px-4 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)]">
        {isLast ? (
          <div className="space-y-2.5">
            {/* Share & Copy actions */}
            <div className="flex gap-2.5">
              <button
                onClick={handleCopy}
                className="flex-1 py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: copied ? "rgba(127,191,176,0.15)" : "rgba(127,191,176,0.1)",
                  color: copied ? "#3D8B7A" : "#5A9E8F",
                  border: "1.5px solid rgba(127,191,176,0.3)",
                }}
              >
                {copied ? "✓ 복사됨!" : "📋 전체 복사"}
              </button>
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
            </div>
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
  );
}
