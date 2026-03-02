"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipe } from "@/lib/hooks/useSwipe";
import type { Scene } from "@/lib/types/story";

const sceneStructure: Record<number, { label: string; bgClass: string }> = {
  1: { label: "도입", bgClass: "bg-[#EEF6F3]" },
  2: { label: "도입", bgClass: "bg-[#EEF6F3]" },
  3: { label: "갈등", bgClass: "bg-[#FEF7ED]" },
  4: { label: "갈등", bgClass: "bg-[#FEF7ED]" },
  5: { label: "시도", bgClass: "bg-[#F4EEF8]" },
  6: { label: "시도", bgClass: "bg-[#F4EEF8]" },
  7: { label: "해결", bgClass: "bg-[#FFF6EE]" },
  8: { label: "해결", bgClass: "bg-[#FFF6EE]" },
  9: { label: "교훈", bgClass: "bg-[#FBF5EC]" },
  10: { label: "교훈", bgClass: "bg-[#FBF5EC]" },
};

interface StoryEditorProps {
  scenes: Scene[];
  title: string;
  onDone: (editedScenes: Scene[], editedTitle: string) => void;
}

export function StoryEditor({ scenes, title, onDone }: StoryEditorProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [editedScenes, setEditedScenes] = useState<Scene[]>(() =>
    scenes.map((s) => ({ ...s }))
  );
  const [editedTitle, setEditedTitle] = useState(title);
  const [originalScenes] = useState<Scene[]>(() =>
    scenes.map((s) => ({ ...s }))
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const scene = editedScenes[currentScene];
  const info = sceneStructure[scene?.sceneNumber] || { label: "", bgClass: "bg-cream" };
  const isFirst = currentScene === 0;
  const isLast = currentScene === editedScenes.length - 1;

  // FR-001: Swipe gestures — disabled when text input is focused to prevent accidental navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: useCallback(() => { if (!isEditing) setCurrentScene((p) => Math.min(editedScenes.length - 1, p + 1)); }, [editedScenes.length, isEditing]),
    onSwipeRight: useCallback(() => { if (!isEditing) setCurrentScene((p) => Math.max(0, p - 1)); }, [isEditing]),
  });

  // FR-004: Check if any content has been modified
  const hasAnyChanges =
    editedTitle !== title ||
    editedScenes.some(
      (s, i) => s.title !== originalScenes[i]?.title || s.text !== originalScenes[i]?.text
    );

  // FR-004: Warn before leaving if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasAnyChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAnyChanges]);

  // FR-004: Auto-save draft to localStorage every 5 seconds
  useEffect(() => {
    if (!hasAnyChanges) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          "mamastale_editor_draft",
          JSON.stringify({ title: editedTitle, scenes: editedScenes, savedAt: Date.now() })
        );
      } catch {}
    }, 5000);
    return () => clearTimeout(timer);
  }, [editedScenes, editedTitle, hasAnyChanges]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(el.scrollHeight, 120) + "px";
    }
  }, [currentScene, scene?.text]);

  const updateScene = useCallback(
    (field: "title" | "text", value: string) => {
      setEditedScenes((prev) =>
        prev.map((s, i) => (i === currentScene ? { ...s, [field]: value } : s))
      );
    },
    [currentScene]
  );

  const resetScene = useCallback(() => {
    const original = originalScenes[currentScene];
    if (original) {
      setEditedScenes((prev) =>
        prev.map((s, i) => (i === currentScene ? { ...original } : s))
      );
    }
  }, [currentScene, originalScenes]);

  const isSceneModified =
    scene?.title !== originalScenes[currentScene]?.title ||
    scene?.text !== originalScenes[currentScene]?.text;

  const handleDone = useCallback(() => {
    try { localStorage.removeItem("mamastale_editor_draft"); } catch {}
    onDone(editedScenes, editedTitle);
  }, [editedScenes, editedTitle, onDone]);

  if (!scene) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 text-center font-sans">
        <div className="text-4xl mb-4">😢</div>
        <h2 className="font-serif text-lg font-bold text-brown mb-2">
          동화 장면을 불러올 수 없어요
        </h2>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
          동화 생성 중 문제가 발생했습니다.<br />
          다시 시도해 주세요.
        </p>
        <button
          onClick={() => window.location.href = "/"}
          className="px-8 py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-xs text-brown-light font-medium">
              동화 편집
            </div>
            <div className="text-center flex-1">
              <div className="text-[10px] text-brown-mid tracking-[2px] font-medium">
                {currentScene + 1} / {editedScenes.length}
              </div>
            </div>
            <button
              onClick={handleDone}
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: "rgba(224,122,95,0.1)", color: "#E07A5F" }}
            >
              완료
            </button>
          </div>
          {/* Tappable progress bar */}
          <div className="flex gap-0.5 px-4 pb-2">
            {editedScenes.map((_, i) => {
              const modified =
                editedScenes[i]?.title !== originalScenes[i]?.title ||
                editedScenes[i]?.text !== originalScenes[i]?.text;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentScene(i)}
                  className="flex-1 min-h-[44px] flex items-center cursor-pointer"
                  aria-label={`장면 ${i + 1}로 이동${modified ? " (수정됨)" : ""}`}
                >
                  <div
                    className="h-[6px] w-full rounded-full transition-all duration-300"
                    style={{
                      background:
                        i === currentScene
                          ? "#E07A5F"
                          : modified
                          ? "#E07A5F66"
                          : "rgba(0,0,0,0.06)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Content — swipeable */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          {...swipeHandlers}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className={`flex-1 flex flex-col px-5 py-6 ${info.bgClass} max-w-3xl mx-auto w-full`}
        >
          {/* Scene badge */}
          <div className="mb-4">
            <span className="text-[10px] text-brown-mid tracking-[2px] font-medium">
              장면 {String(scene.sceneNumber).padStart(2, "0")} · {info.label}
            </span>
          </div>

          {/* Story title — only on first scene */}
          {isFirst && (
            <div className="mb-5">
              <label className="block text-[10px] text-brown-pale font-medium mb-1.5 tracking-wide">
                동화 제목
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl text-base font-serif font-bold bg-white/70 border border-brown-pale/15 text-brown outline-none"
                style={{ fontSize: 18 }}
                aria-label="동화 제목"
              />
            </div>
          )}

          {/* Scene title */}
          <div className="mb-4">
            <label className="block text-[10px] text-brown-pale font-medium mb-1.5 tracking-wide">
              장면 제목
            </label>
            <input
              type="text"
              value={scene.title}
              onChange={(e) => updateScene("title", e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-serif font-bold bg-white/70 border border-brown-pale/15 text-brown outline-none"
              aria-label="장면 제목"
            />
          </div>

          {/* Scene text */}
          <div className="mb-4 flex-1">
            <label className="block text-[10px] text-brown-pale font-medium mb-1.5 tracking-wide">
              본문
            </label>
            <textarea
              ref={textareaRef}
              value={scene.text}
              onChange={(e) => updateScene("text", e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl text-[15px] font-serif bg-white/70 border border-brown-pale/15 text-brown outline-none resize-none leading-[2.2] break-keep"
              style={{ minHeight: 120 }}
              aria-label="장면 본문"
            />
            <div className="flex justify-between items-center mt-1.5">
              {isSceneModified ? (
                <button
                  onClick={resetScene}
                  className="text-[11px] text-brown-pale underline underline-offset-2"
                >
                  ↩ 원래대로
                </button>
              ) : (
                <span />
              )}
              <span
                className="text-[10px] font-light transition-colors"
                style={{ color: scene.text.length >= 480 ? "#E07A5F" : scene.text.length >= 450 ? "#C4956A" : undefined }}
              >
                {scene.text.length}/500
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-black/[0.04]">
        <div className="max-w-3xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)]">
          {isLast ? (
            <div className="space-y-2.5">
              <button
                onClick={handleDone}
                className="w-full py-4 rounded-full text-[15px] font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
                }}
              >
                수정 완료 · 동화 보기
              </button>
              <button
                onClick={() => setCurrentScene((p) => Math.max(0, p - 1))}
                className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
              >
                ← 이전 장면
              </button>
            </div>
          ) : (
            <div className="space-y-2">
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
                  onClick={() => setCurrentScene((p) => Math.min(editedScenes.length - 1, p + 1))}
                  className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
                  }}
                >
                  다음 장면 →
                </button>
              </div>
              {/* Skip editing — for users who just want to read the story as-is */}
              {!hasAnyChanges && (
                <button
                  onClick={handleDone}
                  className="w-full py-2.5 text-[12px] font-light text-brown-pale underline underline-offset-2 decoration-brown-pale/30"
                >
                  수정 없이 바로 보기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
