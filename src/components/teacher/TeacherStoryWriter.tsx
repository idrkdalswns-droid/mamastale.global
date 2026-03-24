"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type { TeacherSpread, TeacherStory } from "@/lib/types/teacher";

interface TeacherStoryWriterProps {
  onSave: (story: TeacherStory) => void;
  onBack: () => void;
}

type WriterMode = "select" | "template" | "paste" | "preview-split" | "edit";

const TEMPLATES = [
  { label: "짧은 동화", count: 8, desc: "8장면" },
  { label: "보통 동화", count: 12, desc: "12장면" },
  { label: "긴 동화", count: 16, desc: "16장면" },
];

const DRAFT_KEY = "mamastale_teacher_writer_draft";

function createEmptySpreads(count: number): TeacherSpread[] {
  return Array.from({ length: count }, (_, i) => ({
    spreadNumber: i + 1,
    title: "",
    text: "",
  }));
}

export function TeacherStoryWriter({ onSave, onBack }: TeacherStoryWriterProps) {
  const [mode, setMode] = useState<WriterMode>("select");
  const [title, setTitle] = useState("");
  const [spreads, setSpreads] = useState<TeacherSpread[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [splitPreview, setSplitPreview] = useState<TeacherSpread[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"tabs" | "scroll">("tabs");
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // localStorage에서 드래프트 복구
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.title && draft.spreads?.length > 0) {
          setTitle(draft.title);
          setSpreads(draft.spreads);
          setMode("edit");
          toast("이전에 작성 중이던 동화를 불러왔습니다.", { icon: "📝", duration: 3000 });
        }
      }
    } catch { /* ignore */ }
  }, []);

  // 30초마다 자동 저장
  useEffect(() => {
    if (mode !== "edit" || spreads.length === 0) return;

    saveTimerRef.current = setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, spreads }));
      } catch { /* ignore */ }
    }, 30_000);

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [mode, title, spreads]);

  // 템플릿 선택
  const handleSelectTemplate = useCallback((count: number) => {
    setSpreads(createEmptySpreads(count));
    setMode("edit");
  }, []);

  // 자유 형식 (직접 설정)
  const [customCount, setCustomCount] = useState(10);
  const handleCustomTemplate = useCallback(() => {
    setSpreads(createEmptySpreads(customCount));
    setMode("edit");
  }, [customCount]);

  // 전체 붙여넣기 → 자동 분할
  const handlePasteSplit = useCallback(() => {
    if (!pasteText.trim()) {
      toast.error("동화 내용을 붙여넣어주세요.");
      return;
    }

    // 더블 줄바꿈 기준 분할
    const parts = pasteText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (parts.length === 0) {
      toast.error("분할할 내용이 없습니다.");
      return;
    }

    // 20장면 초과 시 뒤쪽 병합
    let finalParts = parts;
    if (parts.length > 20) {
      finalParts = parts.slice(0, 19);
      finalParts.push(parts.slice(19).join("\n\n"));
      toast("20장면을 초과하여 뒤쪽을 합쳤습니다.", { icon: "⚠️" });
    }

    const preview = finalParts.map((text, i) => ({
      spreadNumber: i + 1,
      title: "",
      text,
    }));

    setSplitPreview(preview);
    setMode("preview-split");
  }, [pasteText]);

  // 분할 확인 → 편집 모드 진입
  const handleConfirmSplit = useCallback(() => {
    setSpreads(splitPreview);
    setMode("edit");
  }, [splitPreview]);

  // 장면 추가/삭제
  const addSpread = useCallback(() => {
    if (spreads.length >= 20) {
      toast.error("최대 20장면까지 추가할 수 있습니다.");
      return;
    }
    setSpreads(prev => [...prev, {
      spreadNumber: prev.length + 1,
      title: "",
      text: "",
    }]);
    setActiveTab(spreads.length);
  }, [spreads.length]);

  const removeSpread = useCallback((index: number) => {
    if (spreads.length <= 1) {
      toast.error("최소 1장면은 필요합니다.");
      return;
    }
    setSpreads(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, spreadNumber: i + 1 }));
    });
    setActiveTab(prev => Math.min(prev, spreads.length - 2));
  }, [spreads.length]);

  // 장면 텍스트 업데이트
  const updateSpread = useCallback((index: number, field: "title" | "text", value: string) => {
    setSpreads(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // 저장
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    const nonEmptySpreads = spreads.filter(s => s.text.trim().length > 0);
    if (nonEmptySpreads.length === 0) {
      toast.error("최소 1장면의 내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/teacher/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          spreads: nonEmptySpreads.map((s, i) => ({
            spreadNumber: i + 1,
            title: s.title || undefined,
            text: s.text,
          })),
          source: "manual",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "저장 실패");
      }

      const data = await res.json();

      // 드래프트 삭제
      localStorage.removeItem(DRAFT_KEY);

      toast.success("동화가 저장되었습니다!");

      onSave({
        id: data.id,
        sessionId: "",
        title: data.title,
        spreads: nonEmptySpreads,
        metadata: {},
        source: "manual",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [title, spreads, onSave]);

  // 뒤로가기 (드래프트 유지)
  const handleBack = useCallback(() => {
    if (mode === "edit" && spreads.some(s => s.text.trim())) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, spreads }));
      } catch { /* ignore */ }
    }
    onBack();
  }, [mode, title, spreads, onBack]);

  // ─── 렌더링 ───

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-cream">
      {/* 헤더 */}
      <div className="flex-shrink-0 border-b border-brown-pale/15 bg-cream/50 backdrop-blur-sm safe-top">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1 text-brown-light active:scale-[0.9] transition-transform"
            aria-label="뒤로"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="flex-1 text-center text-sm font-medium text-brown">
            직접 동화 작성
          </p>
          {mode === "edit" && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-medium text-coral active:scale-[0.95] transition-transform
                         disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          )}
          {mode !== "edit" && <div className="w-12" />}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {/* ─── 모드 선택 ─── */}
        {mode === "select" && (
          <div className="px-5 py-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-brown mb-1">어떻게 시작할까요?</h2>
              <p className="text-xs text-brown-light">빈 장면부터 시작하거나, 기존 동화를 붙여넣기</p>
            </div>

            {/* 템플릿 선택 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-brown-light">빈 장면부터 시작</p>
              {TEMPLATES.map(t => (
                <button
                  key={t.count}
                  onClick={() => handleSelectTemplate(t.count)}
                  className="w-full p-4 rounded-2xl text-left border border-brown-pale/15
                             bg-paper active:scale-[0.98] transition-all flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-brown">{t.label}</p>
                    <p className="text-xs text-brown-light mt-0.5">{t.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ))}

              {/* 자유 형식 */}
              <div className="flex items-center gap-2 p-4 rounded-2xl border border-brown-pale/15 bg-paper">
                <div className="flex-1">
                  <p className="text-sm font-medium text-brown">자유 형식</p>
                  <p className="text-xs text-brown-light mt-0.5">장면 수 직접 설정</p>
                </div>
                <input
                  type="number"
                  value={customCount}
                  onChange={e => setCustomCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-14 text-center text-sm border border-brown-pale/30 rounded-lg py-1.5 bg-cream text-brown"
                  min={1}
                  max={20}
                />
                <button
                  onClick={handleCustomTemplate}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white
                             active:scale-[0.95] transition-all"
                  style={{ background: "#E07A5F" }}
                >
                  시작
                </button>
              </div>
            </div>

            {/* 전체 붙여넣기 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-brown-light">외부 동화 붙여넣기</p>
              <button
                onClick={() => setMode("paste")}
                className="w-full p-4 rounded-2xl text-left border border-dashed border-brown-pale/30
                           bg-paper/60 active:scale-[0.98] transition-all"
              >
                <p className="text-sm font-medium text-brown">전체 텍스트 붙여넣기</p>
                <p className="text-xs text-brown-light mt-0.5">
                  동화 전체를 붙여넣으면 자동으로 장면을 나눠줘요
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ─── 붙여넣기 모드 ─── */}
        {mode === "paste" && (
          <div className="px-5 py-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-brown mb-1">동화 전체를 붙여넣기</h2>
              <p className="text-xs text-brown-light">빈 줄(엔터 2번)을 기준으로 장면이 나뉩니다</p>
            </div>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="여기에 동화 전체 내용을 붙여넣으세요..."
              className="w-full min-h-[40dvh] p-4 rounded-2xl border border-brown-pale/20 bg-paper
                         text-sm text-brown leading-relaxed resize-none focus:outline-none
                         focus:border-coral/40 placeholder:text-brown-pale"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setMode("select"); setPasteText(""); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-brown
                           border border-brown-pale/30 active:scale-[0.97]"
              >
                취소
              </button>
              <button
                onClick={handlePasteSplit}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white
                           active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                장면 나누기
              </button>
            </div>
          </div>
        )}

        {/* ─── 분할 프리뷰 ─── */}
        {mode === "preview-split" && (
          <div className="px-5 py-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-brown mb-1">
                {splitPreview.length}개 장면으로 나뉘었어요
              </h2>
              <p className="text-xs text-brown-light">확인 후 수정할 수 있습니다</p>
            </div>
            <div className="space-y-3 max-h-[50dvh] overflow-y-auto">
              {splitPreview.map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-paper border border-brown-pale/10">
                  <p className="text-[11px] font-medium text-brown-pale mb-1">{i + 1}장면</p>
                  <p className="text-xs text-brown leading-relaxed whitespace-pre-line line-clamp-4">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode("paste")}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-brown
                           border border-brown-pale/30 active:scale-[0.97]"
              >
                다시 나누기
              </button>
              <button
                onClick={handleConfirmSplit}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white
                           active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                이대로 진행
              </button>
            </div>
          </div>
        )}

        {/* ─── 편집 모드 ─── */}
        {mode === "edit" && (
          <div className="px-5 py-4 space-y-4">
            {/* 제목 입력 */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="동화 제목을 입력하세요"
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-brown-pale/20 bg-paper
                         text-[15px] font-medium text-brown placeholder:text-brown-pale
                         focus:outline-none focus:border-coral/40"
            />

            {/* 보기 모드 토글 + 장면 추가/삭제 */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-paper rounded-lg p-0.5 border border-brown-pale/15">
                <button
                  onClick={() => setViewMode("tabs")}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    viewMode === "tabs" ? "bg-coral text-white" : "text-brown-light"
                  }`}
                >
                  탭
                </button>
                <button
                  onClick={() => setViewMode("scroll")}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    viewMode === "scroll" ? "bg-coral text-white" : "text-brown-light"
                  }`}
                >
                  전체
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addSpread}
                  disabled={spreads.length >= 20}
                  className="text-xs text-coral font-medium disabled:opacity-30"
                >
                  + 장면 추가
                </button>
              </div>
            </div>

            {/* 탭 보기 */}
            {viewMode === "tabs" && (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {spreads.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`flex-shrink-0 w-8 h-8 rounded-lg text-[10px] font-medium transition-all ${
                        i === activeTab
                          ? "bg-coral text-white scale-110"
                          : spreads[i]?.text.trim()
                            ? "bg-paper text-brown-light border border-brown-pale/20"
                            : "bg-cream text-brown-pale border border-dashed border-brown-pale/20"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {spreads[activeTab] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brown-light">{activeTab + 1}장면</span>
                      <button
                        onClick={() => removeSpread(activeTab)}
                        disabled={spreads.length <= 1}
                        className="text-[11px] text-brown-pale disabled:opacity-30"
                      >
                        삭제
                      </button>
                    </div>
                    <input
                      value={spreads[activeTab].title || ""}
                      onChange={e => updateSpread(activeTab, "title", e.target.value)}
                      placeholder="장면 제목 (선택)"
                      maxLength={200}
                      className="w-full px-3 py-2 rounded-lg border border-brown-pale/15 bg-paper
                                 text-sm text-brown placeholder:text-brown-pale
                                 focus:outline-none focus:border-coral/30"
                    />
                    <textarea
                      value={spreads[activeTab].text}
                      onChange={e => updateSpread(activeTab, "text", e.target.value)}
                      placeholder="장면 내용을 입력하세요..."
                      maxLength={5000}
                      className="w-full min-h-[30dvh] p-3 rounded-xl border border-brown-pale/15 bg-paper
                                 text-sm text-brown leading-relaxed resize-none
                                 placeholder:text-brown-pale focus:outline-none focus:border-coral/30"
                    />
                  </div>
                )}
              </>
            )}

            {/* 스크롤 전체 보기 */}
            {viewMode === "scroll" && (
              <div className="space-y-4">
                {spreads.map((spread, i) => (
                  <div key={i} className="p-3 rounded-xl bg-paper border border-brown-pale/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brown-light">{i + 1}장면</span>
                      <button
                        onClick={() => removeSpread(i)}
                        disabled={spreads.length <= 1}
                        className="text-[11px] text-brown-pale disabled:opacity-30"
                      >
                        삭제
                      </button>
                    </div>
                    <input
                      value={spread.title || ""}
                      onChange={e => updateSpread(i, "title", e.target.value)}
                      placeholder="장면 제목 (선택)"
                      maxLength={200}
                      className="w-full px-3 py-2 rounded-lg border border-brown-pale/15 bg-cream
                                 text-sm text-brown placeholder:text-brown-pale
                                 focus:outline-none focus:border-coral/30"
                    />
                    <textarea
                      value={spread.text}
                      onChange={e => updateSpread(i, "text", e.target.value)}
                      placeholder="장면 내용을 입력하세요..."
                      maxLength={5000}
                      rows={3}
                      className="w-full p-3 rounded-lg border border-brown-pale/15 bg-cream
                                 text-sm text-brown leading-relaxed resize-none
                                 placeholder:text-brown-pale focus:outline-none focus:border-coral/30"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 하단 저장 버튼 (편집 모드) */}
            <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="w-full py-4 rounded-full text-white text-[15px] font-medium
                           transition-all active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
                }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    저장 중...
                  </span>
                ) : (
                  "동화 저장하기"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
