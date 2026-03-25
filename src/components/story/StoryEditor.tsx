"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type { Scene } from "@/lib/types/story";
import { cleanSceneText } from "@/lib/utils/story-parser";

interface StoryEditorProps {
  scenes: Scene[];
  title: string;
  onDone: (editedScenes: Scene[], editedTitle: string) => void;
}

interface UndoEntry {
  scenes: Scene[];
  title: string;
  label: string; // e.g. "3페이지 수정"
}

const MAX_UNDO = 20;

export function StoryEditor({ scenes, title, onDone }: StoryEditorProps) {
  const [editedScenes, setEditedScenes] = useState<Scene[]>(() =>
    scenes.map((s) => ({ ...s, text: cleanSceneText(s.text) }))
  );
  const [editedTitle, setEditedTitle] = useState(title);
  const [originalScenes] = useState<Scene[]>(() =>
    scenes.map((s) => ({ ...s, text: cleanSceneText(s.text) }))
  );
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  // Bug Bounty Fix 2-12: Use refs to capture current state for pushUndo,
  // preventing stale closure when rapid edits occur.
  const editedScenesRef = useRef(editedScenes);
  editedScenesRef.current = editedScenes;
  const editedTitleRef = useRef(editedTitle);
  editedTitleRef.current = editedTitle;

  // Push current state to undo stack before mutation
  const pushUndo = useCallback((label: string) => {
    setUndoStack((prev) => {
      const entry: UndoEntry = { scenes: editedScenesRef.current.map((s) => ({ ...s })), title: editedTitleRef.current, label };
      const next = [...prev, entry];
      return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
    });
  }, []);

  // Pop and restore from undo stack
  const popUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      setEditedScenes(entry.scenes);
      setEditedTitle(entry.title);
      return prev.slice(0, -1);
    });
  }, []);

  // Keyboard shortcut: Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        popUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [popUndo]);

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

  // Auto-resize all textareas on content change
  useEffect(() => {
    textareaRefs.current.forEach((el) => {
      if (el) {
        el.style.height = "auto";
        el.style.height = Math.max(el.scrollHeight, 80) + "px";
      }
    });
  }, [editedScenes]);

  // Debounced undo push for text edits (push once per focus session, not per keystroke)
  const lastPushedRef = useRef<{ index: number; time: number } | null>(null);

  const updateScene = useCallback(
    (index: number, value: string) => {
      // Push undo only on first edit of this scene in this burst (3s debounce)
      const now = Date.now();
      const last = lastPushedRef.current;
      if (!last || last.index !== index || now - last.time > 3000) {
        pushUndo(`${index + 1}페이지 수정`);
        lastPushedRef.current = { index, time: now };
      }
      setEditedScenes((prev) =>
        prev.map((s, i) => (i === index ? { ...s, text: value } : s))
      );
    },
    [pushUndo]
  );

  const resetScene = useCallback(
    (index: number) => {
      const original = originalScenes[index];
      if (original) {
        pushUndo(`${index + 1}페이지 되돌리기`);
        setEditedScenes((prev) =>
          prev.map((s, i) => (i === index ? { ...original } : s))
        );
      }
    },
    [originalScenes, pushUndo]
  );

  const handleDone = useCallback(() => {
    // V5-FIX #21: Validate no empty scenes before completing
    const hasEmptyScene = editedScenes.some(s => !s.text?.trim());
    if (hasEmptyScene) {
      const emptyIdx = editedScenes.findIndex(s => !s.text?.trim());
      toast.error(`${emptyIdx + 1}페이지의 내용이 비어있어요.`);
      return;
    }
    try { localStorage.removeItem("mamastale_editor_draft"); } catch {}
    onDone(editedScenes, editedTitle);
  }, [editedScenes, editedTitle, onDone]);

  // Guard: empty scenes
  if (!editedScenes.length) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 text-center font-sans">
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
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-xs text-brown-light font-medium">
              동화 편집
            </div>
            {undoStack.length > 0 && (
              <button
                onClick={popUndo}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full min-h-[36px] flex items-center gap-1 transition-all active:scale-[0.95]"
                style={{ background: "rgba(90,62,43,0.06)", color: "#8B6F55" }}
                aria-label="되돌리기"
                title={`되돌리기: ${undoStack[undoStack.length - 1].label}`}
              >
                ↩ 되돌리기
              </button>
            )}
          </div>
          <button
            onClick={handleDone}
            className="text-xs font-medium px-3 py-1.5 rounded-full min-h-[44px] flex items-center justify-center"
            style={{ background: "rgba(224,122,95,0.1)", color: "#E07A5F" }}
          >
            완료
          </button>
        </div>
        {/* M-10: Scene quick navigation */}
        <div className="flex gap-1 justify-center px-4 pb-2">
          {editedScenes.map((s, i) => {
            const modified = s.text !== originalScenes[i]?.text;
            return (
              <button
                key={i}
                onClick={() => {
                  textareaRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
                  // R7-5: Auto-focus textarea after scroll for keyboard users
                  setTimeout(() => textareaRefs.current[i]?.focus(), 400);
                }}
                className="min-w-[32px] h-8 rounded-full text-[11px] font-medium transition-all active:scale-90 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:outline-none"
                style={{
                  background: modified ? "rgba(224,122,95,0.12)" : "rgba(0,0,0,0.03)",
                  color: modified ? "#E07A5F" : "#8B6F55",
                }}
                aria-label={`${i + 1}페이지로 이동${modified ? " (수정됨)" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-3xl mx-auto w-full">
        {/* Story Title */}
        <div className="mb-8">
          <label htmlFor="story-title" className="block text-[10px] text-brown-pale font-medium mb-1.5 tracking-wide">
            동화 제목
          </label>
          <input
            id="story-title"
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            maxLength={100}
            required
            className="w-full px-4 py-3 rounded-xl text-base font-serif font-bold bg-white/70 border border-brown-pale/15 text-brown outline-none"
            style={{ fontSize: 18 }}
          />
        </div>

        {/* All Scenes — continuous scroll */}
        {editedScenes.map((scene, index) => {
          const isModified =
            scene.text !== originalScenes[index]?.text;

          return (
            <div key={scene.sceneNumber} className="mb-6">
              {/* Simple page number */}
              <div className="text-[10px] text-brown-pale font-medium mb-2 tracking-wide">
                {index + 1}페이지
              </div>

              <textarea
                ref={(el) => { textareaRefs.current[index] = el; }}
                value={scene.text}
                onChange={(e) => updateScene(index, e.target.value)}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl text-[15px] font-serif bg-white/70 border border-brown-pale/15 text-brown outline-none resize-none leading-[2.2] break-keep"
                style={{ minHeight: 80 }}
                aria-label={`${index + 1}페이지 본문`}
              />

              <div className="flex justify-end items-center mt-1.5">
                <span
                  className="text-[10px] font-light transition-colors"
                  style={{
                    color: scene.text.length >= 480 ? "#E07A5F" : scene.text.length >= 450 ? "#C4956A" : undefined,
                  }}
                >
                  {scene.text.length}/500
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom button */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-black/[0.04]">
        <div className="max-w-3xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)]">
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
          {!hasAnyChanges && (
            <button
              onClick={handleDone}
              className="w-full py-2.5 min-h-[44px] text-[12px] font-light text-brown-pale underline underline-offset-2 decoration-brown-pale/30 mt-2"
            >
              수정 없이 바로 보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
