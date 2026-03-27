"use client";

import React, { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import type {
  TeacherStory,
  TeacherSpread,
} from "@/lib/types/teacher";
import { authFetchOnce } from "@/lib/utils/auth-fetch";
import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { useTickets } from "@/lib/hooks/useTickets";
import { WorksheetHistory } from "@/components/teacher/worksheet/WorksheetHistory";
import { SpreadEditor } from "@/components/teacher/preview/SpreadEditor";
import { SpreadNavigation } from "@/components/teacher/preview/SpreadNavigation";
import { TeacherActions } from "@/components/teacher/preview/TeacherActions";
import { FocusTrapModal } from "@/components/ui/FocusTrapModal";

interface TeacherPreviewProps {
  story: TeacherStory;
  onNewStory: () => void;
  onBack?: () => void;
  onEditStory?: () => void;
  onStoryDeleted?: (storyId: string) => void;
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
  onEditStory,
  onStoryDeleted,
}: TeacherPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [editingSpread, setEditingSpread] = useState<number | null>(null);
  const [editedSpreads, setEditedSpreads] = useState<TeacherSpread[]>(
    story.spreads || []
  );
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { ticketData } = useTickets();

  useEffect(() => {
    setEditedSpreads(story.spreads || []);
    setEditingSpread(null);
    setCurrentPage(0);
  }, [story.spreads]);

  // R2: Cleanup debounce timer + status reset timer on unmount
  const statusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const metadata = story.metadata || {};
  const spreads = editedSpreads;
  const totalPages = Math.max(1, Math.ceil(spreads.length / 2));

  // ─── 스프레드 편집 ───
  const handleEdit = useCallback((index: number) => {
    setEditingSpread(index);
  }, []);

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  // H5-FIX: useRef to track latest spreads for side-effect (avoids stale closure)
  const editedSpreadsRef = React.useRef(editedSpreads);
  editedSpreadsRef.current = editedSpreads;

  const handleSaveEdit = useCallback((index: number, newText: string) => {
    // H5-FIX: Pure setState updater — no side-effects inside
    setEditedSpreads((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
    setEditingSpread(null);

    // H5-FIX: Side-effect (debounced DB save) moved OUTSIDE setState
    if (story.id && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (story.id) {
      saveTimeoutRef.current = setTimeout(async () => {
        // Use ref for latest spreads (stale closure defense)
        const currentSpreads = [...editedSpreadsRef.current];
        currentSpreads[index] = { ...currentSpreads[index], text: newText };

        setSaveStatus("saving");
        try {
          const res = await fetch(`/api/teacher/stories/${story.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spreads: currentSpreads }),
          });
          if (res.ok) {
            setSaveStatus("saved");
            statusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
          } else {
            setSaveStatus("error");
            toast.error("저장에 실패했습니다.");
          }
        } catch {
          setSaveStatus("error");
          toast.error("저장에 실패했습니다.");
        }
      }, 1000);
    }
  }, [story.id]);

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
        const res = await authFetchOnce("/api/teacher/generate-pdf", {
          method: "POST",
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

  // ─── 학부모 공유 ───
  const handleShare = useCallback(async () => {
    if (!story.id || shareLoading) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/teacher/stories/${story.id}/share`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error || "공유 링크 생성에 실패했습니다.");
        return;
      }
      const { shareUrl } = await res.json() as { shareUrl: string };
      // Web Share API or clipboard fallback
      if (navigator.share) {
        await navigator.share({
          title: story.title || "동화",
          text: `선생님이 공유한 동화: ${story.title || ""}`,
          url: shareUrl,
        }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("공유 링크가 복사되었습니다!");
      }
    } catch {
      toast.error("공유 링크 생성에 실패했습니다.");
    } finally {
      setShareLoading(false);
    }
  }, [story.id, story.title, shareLoading]);

  // ─── 활동지 열기 ───
  const handleOpenWorksheet = useCallback(() => {
    const wsTickets = ticketData.worksheetTicketsRemaining;
    if (wsTickets <= 0) {
      toast.error("활동지 티켓이 없습니다. 티켓을 구매해주세요.");
      return;
    }
    useWorksheetStore.getState().open(story.id!, story.title || "동화");
  }, [story.id, story.title, ticketData.worksheetTicketsRemaining]);

  // ─── 삭제 ───
  const handleDelete = useCallback(async () => {
    if (!story?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teacher/stories/${story.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("동화가 삭제되었습니다.");
      setShowDeleteConfirm(false);
      onStoryDeleted?.(story.id);
      onBack?.();
    } catch {
      toast.error("삭제에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
    }
  }, [story?.id, isDeleting, onStoryDeleted, onBack]);

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
                  <svg className="inline-block w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>읽어주기 가이드
                </summary>
                <div className="px-4 py-3 text-sm text-brown leading-relaxed whitespace-pre-line break-keep bg-paper/20">
                  {metadata.readingGuide}
                </div>
              </details>
            )}
            {metadata.nuriMapping && (
              <details className="rounded-xl border border-brown-pale/20 overflow-hidden">
                <summary className="px-4 py-3 text-sm font-medium text-brown cursor-pointer select-none bg-paper/40 hover:bg-paper/60 transition-colors">
                  <svg className="inline-block w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>누리과정 연계
                </summary>
                <div className="px-4 py-3 text-sm text-brown leading-relaxed whitespace-pre-line break-keep bg-paper/20">
                  {metadata.nuriMapping}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ─── 액션 버튼 영역 (활동지 CTA + 공유 + 다운로드) ─── */}
      <TeacherActions
        storyId={story.id}
        storyTitle={story.title}
        spreads={spreads}
        pdfLoading={pdfLoading}
        pdfError={pdfError}
        shareLoading={shareLoading}
        worksheetTicketsRemaining={ticketData.worksheetTicketsRemaining}
        onDownload={handleDownload}
        onShare={handleShare}
        onEditStory={onEditStory}
        onOpenWorksheet={handleOpenWorksheet}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* ─── 활동지 히스토리 ─── */}
      {story.id && <WorksheetHistory storyId={story.id} />}

      {/* ─── 삭제 확인 모달 ─── */}
      <FocusTrapModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} label="동화 삭제 확인" role="alertdialog">
        <div className="bg-white rounded-2xl p-5 mx-6 max-w-[320px] shadow-xl">
          <h3 className="text-[15px] font-bold text-center mb-2" style={{ color: "rgb(var(--brown))" }}>
            이 동화를 삭제할까요?
          </h3>
          <p className="text-[12px] text-center mb-4" style={{ color: "rgb(var(--brown-light))" }}>
            삭제된 동화는 복구할 수 없습니다.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border" style={{ borderColor: "rgb(var(--brown-pale))", color: "rgb(var(--brown))" }}>
              취소
            </button>
            <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white" style={{ background: "#DC2626" }}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      </FocusTrapModal>
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
      <SpreadNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onSelectPage={onSelectPage}
        onNext={onNext}
        onPrev={onPrev}
      />
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
      <div className="flex items-center justify-end mb-2">
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
          {/* 편집하기 링크 삭제 — 하단 CTA로 이동 */}
        </div>
      )}
    </div>
  );
}
