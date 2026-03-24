"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import type {
  TeacherStory,
  TeacherSpread,
} from "@/lib/types/teacher";
import { createClient } from "@/lib/supabase/client";
import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { WorksheetHistory } from "@/components/teacher/worksheet/WorksheetHistory";

interface TeacherPreviewProps {
  story: TeacherStory;
  onNewStory: () => void;
  onBack?: () => void;
}

/** 스프레드 배경색 — 3막 구조에 따른 색상 */
function getSpreadBg(num: number): string {
  if (num <= 4) return "#EEF6F3";
  if (num <= 11) return "#FFF4ED";
  return "#F3EDF7";
}

export function TeacherPreview({
  story,
  onNewStory,
  onBack,
}: TeacherPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [editingSpread, setEditingSpread] = useState<number | null>(null);
  const [editedSpreads, setEditedSpreads] = useState<TeacherSpread[]>(
    story.spreads || []
  );
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    setEditedSpreads(story.spreads || []);
    setEditingSpread(null);
    setCurrentPage(0);
  }, [story.spreads]);

  const metadata = story.metadata || {};
  const spreads = editedSpreads;
  const totalPages = Math.max(1, Math.ceil(spreads.length / 2));

  // ─── 스프레드 편집 ───
  const handleEdit = useCallback((index: number) => {
    setEditingSpread(index);
  }, []);

  const handleSaveEdit = useCallback((index: number, newText: string) => {
    setEditedSpreads((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
    setEditingSpread(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSpread(null);
  }, []);

  // ─── 2-spread 페이지 네비게이션 ───
  const goNext = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  // ─── PDF/DOC 다운로드 ───
  const handleDownload = useCallback(
    async (type: "free-activity" | "activity" | "guide", format: "html" | "doc" = "html") => {
      if (pdfLoading) return;
      const loadingKey = `${type}-${format}`;
      setPdfLoading(loadingKey);
      setPdfError(null);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch("/api/teacher/generate-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            type,
            format,
            ...(story.id
              ? { storyId: story.id }
              : {
                  story: {
                    title: story.title,
                    spreads: spreads.map((s) => ({
                      spreadNumber: s.spreadNumber,
                      title: s.title,
                      text: s.text,
                    })),
                    metadata,
                  },
                }),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error || "생성에 실패했습니다."
          );
        }

        if (format === "doc") {
          // .doc 파일 다운로드
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${story.title || "활동지"}.doc`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // HTML → 새 탭에서 열기 (인쇄용)
          const html = await res.text();
          const win = window.open("", "_blank");
          if (win) {
            win.document.write(html);
            win.document.close();
          } else {
            const blob = new Blob([html], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${story.title || "활동지"}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }
      } catch (err) {
        console.error("[TeacherPreview] Download error:", err);
        setPdfError(
          err instanceof Error ? err.message : "생성에 실패했습니다."
        );
      } finally {
        setPdfLoading(null);
      }
    },
    [pdfLoading, story, spreads, metadata]
  );

  return (
    <div className="flex flex-col min-h-[60dvh]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brown-pale/20">
        {onBack && (
          <button onClick={onBack} className="text-sm text-brown-light">
            ← 서재로
          </button>
        )}
        <h1 className="text-base font-semibold text-brown truncate flex-1 text-center">
          {story.title || "새 동화"}
        </h1>
        <button onClick={onNewStory} className="text-sm text-coral font-medium">
          새 동화
        </button>
      </div>

      {/* 스프레드 뷰 (탭 없음) */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {/* 표지 이미지 */}
        {story.coverImage && (
          <div className="mb-4 mt-3 rounded-2xl overflow-hidden shadow-sm">
            <img
              src={story.coverImage}
              alt={`${story.title || "동화"} 표지`}
              className="w-full h-auto object-cover"
              style={{ maxHeight: "280px" }}
            />
            <p className="text-[10px] text-brown-pale text-center py-1 bg-paper/40">
              AI 생성 표지
            </p>
          </div>
        )}

        {/* 2-spread 뷰 */}
        {spreads.length === 0 ? (
          <div className="text-center py-12 text-sm text-brown-light">
            동화가 아직 생성되지 않았습니다.
          </div>
        ) : (
          <SpreadsView
            spreads={spreads}
            currentPage={currentPage}
            totalPages={totalPages}
            editingSpread={editingSpread}
            onSelectPage={setCurrentPage}
            onNext={goNext}
            onPrev={goPrev}
            onEdit={handleEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {/* ─── 접이식 교육 정보 (탭 대체) ─── */}
        {(metadata.readingGuide || metadata.nuriMapping) && (
          <div className="mt-4 space-y-2">
            {metadata.readingGuide && (
              <details className="rounded-xl border border-brown-pale/20 overflow-hidden">
                <summary className="px-4 py-3 text-sm font-medium text-brown cursor-pointer select-none bg-paper/40 hover:bg-paper/60 transition-colors">
                  📖 읽어주기 가이드
                </summary>
                <div className="px-4 py-3 text-sm text-brown leading-relaxed whitespace-pre-line break-keep bg-paper/20">
                  {metadata.readingGuide}
                </div>
              </details>
            )}
            {metadata.nuriMapping && (
              <details className="rounded-xl border border-brown-pale/20 overflow-hidden">
                <summary className="px-4 py-3 text-sm font-medium text-brown cursor-pointer select-none bg-paper/40 hover:bg-paper/60 transition-colors">
                  🎯 누리과정 연계
                </summary>
                <div className="px-4 py-3 text-sm text-brown leading-relaxed whitespace-pre-line break-keep bg-paper/20">
                  {metadata.nuriMapping}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ─── AI 맞춤 활동지 CTA ─── */}
      {story.id && (
        <div className="px-4 pt-3">
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/tickets");
                if (res.ok) {
                  const data = await res.json();
                  const tickets = data.worksheet_tickets_remaining ?? data.free_stories_remaining ?? 0;
                  if (tickets <= 0) {
                    toast.error("활동지 티켓이 없습니다. 티켓을 구매해주세요.");
                    return;
                  }
                }
              } catch {
                // 티켓 확인 실패 시 일단 진행
              }
              useWorksheetStore.getState().open(story.id!, story.title || "동화");
            }}
            className="w-full py-3 rounded-xl text-[14px] font-medium text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #8B6AAF, #7A5BA0)",
              boxShadow: "0 4px 16px rgba(139,106,175,0.25)",
            }}
          >
            ✨ AI 맞춤 활동지 만들기
          </button>
        </div>
      )}

      {/* ─── 활동지 히스토리 ─── */}
      {story.id && <WorksheetHistory storyId={story.id} />}

      {/* ─── 다운로드 영역 ─── */}
      <div className="px-4 pb-4 pt-2 border-t border-brown-pale/20 space-y-3
                       pb-[max(1rem,env(safe-area-inset-bottom,0px))]">

        {/* 동화 인쇄 */}
        <button
          onClick={() => handleDownload("activity", "html")}
          disabled={!!pdfLoading || spreads.length === 0}
          className="w-full py-2.5 rounded-xl text-xs font-medium text-brown-light
                     border border-brown-pale/30 transition-all active:scale-[0.97]
                     disabled:opacity-40 bg-paper/40"
        >
          {pdfLoading?.startsWith("activity") ? (
            <span className="animate-pulse">생성 중...</span>
          ) : (
            "🖨️ 동화 인쇄"
          )}
        </button>

        {/* 무료 활동지 다운로드 */}
        <div>
          <p className="text-[11px] text-brown-pale text-center mb-2">
            무료 활동지 다운로드
          </p>
          {pdfError && (
            <p className="text-xs text-red-500 text-center break-keep mb-1">
              {pdfError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload("free-activity", "html")}
              disabled={!!pdfLoading || spreads.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl
                         text-sm font-medium text-white transition-all active:scale-[0.97]
                         disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              {pdfLoading === "free-activity-html" ? (
                <span className="animate-pulse">생성 중...</span>
              ) : (
                <>📄 PDF</>
              )}
            </button>
            <button
              onClick={() => handleDownload("free-activity", "doc")}
              disabled={!!pdfLoading || spreads.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl
                         text-sm font-medium text-brown border border-brown-pale/30
                         transition-all active:scale-[0.97] disabled:opacity-40
                         bg-paper/60"
            >
              {pdfLoading === "free-activity-doc" ? (
                <span className="animate-pulse text-brown-light">생성 중...</span>
              ) : (
                <>📝 DOC (편집 가능)</>
              )}
            </button>
          </div>
          {spreads.length === 0 && (
            <p className="text-[10px] text-brown-pale text-center mt-1">
              동화를 먼저 완성해주세요
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 2-spread 뷰 ───

interface SpreadsViewProps {
  spreads: TeacherSpread[];
  currentPage: number;
  totalPages: number;
  editingSpread: number | null;
  onSelectPage: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onEdit: (index: number) => void;
  onSaveEdit: (index: number, text: string) => void;
  onCancelEdit: () => void;
}

function SpreadsView({
  spreads,
  currentPage,
  totalPages,
  editingSpread,
  onSelectPage,
  onNext,
  onPrev,
  onEdit,
  onSaveEdit,
  onCancelEdit,
}: SpreadsViewProps) {
  const topIndex = currentPage * 2;
  const bottomIndex = currentPage * 2 + 1;
  const topSpread = spreads[topIndex];
  const bottomSpread = bottomIndex < spreads.length ? spreads[bottomIndex] : null;

  // 편집 중이면 해당 스프레드만 전체 표시
  const isEditingTop = editingSpread === topIndex;
  const isEditingBottom = editingSpread === bottomIndex;
  const isEditing = isEditingTop || isEditingBottom;

  return (
    <div className="space-y-3">
      {/* 스프레드 카드 — 위 */}
      {(!isEditing || isEditingTop) && topSpread && (
        <SpreadCard
          spread={topSpread}
          index={topIndex}
          total={spreads.length}
          isEditing={isEditingTop}
          compact={!isEditing}
          onEdit={onEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />
      )}

      {/* 스프레드 카드 — 아래 (편집 중 아닐 때만) */}
      {(!isEditing || isEditingBottom) && bottomSpread && (
        <SpreadCard
          spread={bottomSpread}
          index={bottomIndex}
          total={spreads.length}
          isEditing={isEditingBottom}
          compact={!isEditing}
          onEdit={onEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />
      )}

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={currentPage === 0}
          className="px-4 py-2 rounded-full text-xs font-medium text-brown-light
                     border border-brown-pale/30 disabled:opacity-30
                     active:scale-[0.97] transition-all"
        >
          ← 이전
        </button>
        <span className="text-xs text-brown-pale">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={currentPage === totalPages - 1}
          className="px-4 py-2 rounded-full text-xs font-medium text-white
                     disabled:opacity-30 active:scale-[0.97] transition-all"
          style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
        >
          다음 →
        </button>
      </div>

      {/* 페이지 썸네일 */}
      <div className="flex gap-1.5 justify-center py-1">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onSelectPage(i)}
            className={`w-8 h-8 rounded-lg text-[10px] font-medium transition-all ${
              i === currentPage
                ? "bg-coral text-white scale-110"
                : "bg-paper/60 text-brown-light"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 스프레드 카드 ───

interface SpreadCardProps {
  spread: TeacherSpread;
  index: number;
  total: number;
  isEditing: boolean;
  compact: boolean;
  onEdit: (index: number) => void;
  onSaveEdit: (index: number, text: string) => void;
  onCancelEdit: () => void;
}

function SpreadCard({
  spread,
  index,
  total,
  isEditing,
  compact,
  onEdit,
  onSaveEdit,
  onCancelEdit,
}: SpreadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const text = spread.text;
  const isLong = text.length > 150;
  const displayText = compact && isLong && !expanded
    ? text.slice(0, 150) + "..."
    : text;

  return (
    <div
      className="rounded-2xl p-4 relative"
      style={{ backgroundColor: getSpreadBg(spread.spreadNumber) }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-brown-light/60">
          SP{String(spread.spreadNumber).padStart(2, "0")}
        </span>
        <span className="text-[10px] text-brown-pale">
          {index + 1} / {total}
        </span>
      </div>

      {spread.title && (
        <h3 className="text-sm font-semibold text-brown mb-2 break-keep">
          {spread.title}
        </h3>
      )}

      {isEditing ? (
        <SpreadEditor
          text={text}
          onSave={(t) => onSaveEdit(index, t)}
          onCancel={onCancelEdit}
        />
      ) : (
        <div>
          <p className="text-sm text-brown leading-relaxed whitespace-pre-line break-keep">
            {displayText}
          </p>
          {compact && isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-coral font-medium mt-1"
            >
              {expanded ? "접기" : "더보기"}
            </button>
          )}
          <button
            onClick={() => onEdit(index)}
            className="text-[11px] text-brown-pale underline underline-offset-2
                       decoration-brown-pale/30 mt-2 block"
          >
            편집하기
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 스프레드 에디터 ───

interface SpreadEditorProps {
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

function SpreadEditor({ text, onSave, onCancel }: SpreadEditorProps) {
  const [editText, setEditText] = useState(text);

  return (
    <div className="space-y-3">
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 rounded-xl border border-brown-pale/30
                   text-sm text-brown bg-white/60 resize-none
                   focus:outline-none focus:ring-2 focus:ring-coral/30"
        style={{ fontSize: "14px" }}
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-full text-xs text-brown-light
                     border border-brown-pale/30"
        >
          취소
        </button>
        <button
          onClick={() => onSave(editText)}
          className="px-3 py-1.5 rounded-full text-xs text-white font-medium"
          style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
        >
          저장
        </button>
      </div>
    </div>
  );
}
