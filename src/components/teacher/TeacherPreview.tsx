"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import type {
  TeacherStory,
  TeacherSpread,
  TeacherStoryMetadata,
} from "@/lib/types/teacher";
import { createClient } from "@/lib/supabase/client";

const TAB_ICONS: Record<string, string> = {
  spreads: "/images/teacher/tab/spreads.jpeg",
  guide: "/images/teacher/tab/guide.jpeg",
  nuri: "/images/teacher/tab/nuri.jpeg",
  illust: "/images/teacher/tab/illust.jpeg",
  review: "/images/teacher/tab/review.jpeg",
};

interface TeacherPreviewProps {
  story: TeacherStory;
  onNewStory: () => void;
  onBack?: () => void;
}

type TabType = "spreads" | "guide" | "nuri" | "illust" | "review";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "spreads", label: "동화", icon: "📖" },
  { id: "guide", label: "가이드", icon: "📋" },
  { id: "nuri", label: "누리과정", icon: "🎯" },
  { id: "illust", label: "삽화", icon: "🎨" },
  { id: "review", label: "검수", icon: "✅" },
];

/** 스프레드 배경색 — 3막 구조에 따른 색상 */
function getSpreadBg(num: number): string {
  if (num <= 4) return "#EEF6F3"; // 1막: 도입 (민트)
  if (num <= 11) return "#FFF4ED"; // 2막: 전개 (코랄)
  return "#F3EDF7"; // 3막: 결말 (라벤더)
}

export function TeacherPreview({
  story,
  onNewStory,
  onBack,
}: TeacherPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("spreads");
  const [currentSpread, setCurrentSpread] = useState(0);
  const [editingSpread, setEditingSpread] = useState<number | null>(null);
  const [editedSpreads, setEditedSpreads] = useState<TeacherSpread[]>(
    story.spreads || []
  );
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // story.spreads가 변경되면 동기화 (부모가 1회만 set하므로 실질적으로 초기화 용도)
  useEffect(() => {
    setEditedSpreads(story.spreads || []);
    setEditingSpread(null);
    setCurrentSpread(0);
  }, [story.spreads]);

  const metadata = story.metadata || {};
  const spreads = editedSpreads;

  // ─── 스프레드 편집 ───
  const handleEdit = useCallback(
    (index: number) => {
      setEditingSpread(index);
    },
    []
  );

  const handleSaveEdit = useCallback(
    (index: number, newText: string) => {
      setEditedSpreads((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], text: newText };
        return updated;
      });
      setEditingSpread(null);
    },
    []
  );

  const handleCancelEdit = useCallback(() => {
    setEditingSpread(null);
  }, []);

  // ─── 네비게이션 ───
  const goNext = useCallback(() => {
    setCurrentSpread((p) => Math.min(p + 1, spreads.length - 1));
  }, [spreads.length]);

  const goPrev = useCallback(() => {
    setCurrentSpread((p) => Math.max(p - 1, 0));
  }, []);

  // ─── PDF 다운로드 ───
  const handleDownloadPdf = useCallback(
    async (type: "activity" | "guide") => {
      if (pdfLoading) return;
      setPdfLoading(type);
      setPdfError(null);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch("/api/teacher/generate-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            type,
            // storyId가 있으면 DB에서 조회, 없으면 직접 전달
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
            (err as { error?: string }).error || "PDF 생성에 실패했습니다."
          );
        }

        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
        } else {
          // 팝업 차단 시 — Blob으로 다운로드
          const blob = new Blob([html], { type: "text/html;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${story.title || "동화"}_${type === "activity" ? "활동지" : "가이드"}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error("[TeacherPreview] PDF error:", err);
        setPdfError(
          err instanceof Error ? err.message : "PDF 생성에 실패했습니다."
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
          <button
            onClick={onBack}
            className="text-sm text-brown-light"
          >
            ← 돌아가기
          </button>
        )}
        <h1 className="text-base font-semibold text-brown truncate flex-1 text-center">
          {story.title || "새 동화"}
        </h1>
        <button
          onClick={onNewStory}
          className="text-sm text-coral font-medium"
        >
          새 동화
        </button>
      </div>

      {/* 탭 바 */}
      <div className="flex gap-0.5 px-3 pt-3 pb-2 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          // 탭에 콘텐츠가 없으면 비활성
          const hasContent =
            tab.id === "spreads" ||
            (tab.id === "guide" && metadata.readingGuide) ||
            (tab.id === "nuri" && metadata.nuriMapping) ||
            (tab.id === "illust" && metadata.illustPrompts) ||
            (tab.id === "review" && metadata.devReview);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!hasContent}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                         whitespace-nowrap transition-all
                         ${
                           isActive
                             ? "bg-coral text-white"
                             : hasContent
                               ? "bg-paper/60 text-brown-light hover:bg-paper"
                               : "bg-paper/30 text-brown-pale/50 cursor-not-allowed"
                         }`}
            >
              <Image
                src={TAB_ICONS[tab.id]}
                alt={tab.label}
                width={20}
                height={20}
                className="rounded object-cover"
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {activeTab === "spreads" && (
          <SpreadsView
            spreads={spreads}
            currentSpread={currentSpread}
            editingSpread={editingSpread}
            onSelect={setCurrentSpread}
            onNext={goNext}
            onPrev={goPrev}
            onEdit={handleEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {activeTab === "guide" && metadata.readingGuide && (
          <MetadataSection
            title="읽어주기 가이드"
            icon="/images/teacher/tab/guide.jpeg"
            content={metadata.readingGuide}
          />
        )}

        {activeTab === "nuri" && metadata.nuriMapping && (
          <MetadataSection
            title="누리과정 연계 매핑"
            icon="/images/teacher/tab/nuri.jpeg"
            content={metadata.nuriMapping}
          />
        )}

        {activeTab === "illust" && metadata.illustPrompts && (
          <MetadataSection
            title="삽화 프롬프트"
            icon="/images/teacher/tab/illust.jpeg"
            content={metadata.illustPrompts}
          />
        )}

        {activeTab === "review" && metadata.devReview && (
          <MetadataSection
            title="발달 적합성 검수"
            icon="/images/teacher/tab/review.jpeg"
            content={metadata.devReview}
          />
        )}
      </div>

      {/* ─── PDF 다운로드 ─── */}
      <div className="px-4 pb-4 pt-2 border-t border-brown-pale/20 space-y-2
                       pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <p className="text-[11px] text-brown-pale text-center mb-2">
          인쇄 / PDF 저장
        </p>
        {pdfError && (
          <p className="text-xs text-red-500 text-center break-keep mb-1">
            {pdfError}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => handleDownloadPdf("activity")}
            disabled={!!pdfLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                       text-sm font-medium text-white transition-all active:scale-[0.97]
                       disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
            }}
          >
            {pdfLoading === "activity" ? (
              <span className="animate-pulse">생성 중...</span>
            ) : (
              <>
                <Image src="/images/teacher/icon/activity.jpeg" alt="활동지" width={16} height={16} className="rounded object-cover" />
                <span>활동지 (16p)</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleDownloadPdf("guide")}
            disabled={!!pdfLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                       text-sm font-medium text-brown border border-brown-pale/30
                       transition-all active:scale-[0.97] disabled:opacity-50
                       bg-paper/60"
          >
            {pdfLoading === "guide" ? (
              <span className="animate-pulse text-brown-light">생성 중...</span>
            ) : (
              <>
                <Image src="/images/teacher/tab/guide.jpeg" alt="가이드" width={16} height={16} className="rounded object-cover" />
                <span>읽기 가이드</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 스프레드 뷰 ───

interface SpreadsViewProps {
  spreads: TeacherSpread[];
  currentSpread: number;
  editingSpread: number | null;
  onSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onEdit: (index: number) => void;
  onSaveEdit: (index: number, text: string) => void;
  onCancelEdit: () => void;
}

function SpreadsView({
  spreads,
  currentSpread,
  editingSpread,
  onSelect,
  onNext,
  onPrev,
  onEdit,
  onSaveEdit,
  onCancelEdit,
}: SpreadsViewProps) {
  const spread = spreads[currentSpread];
  if (!spread) return null;

  return (
    <div className="space-y-4">
      {/* 스프레드 카드 */}
      <div
        className="rounded-2xl p-5 min-h-[200px] relative"
        style={{ backgroundColor: getSpreadBg(spread.spreadNumber) }}
      >
        {/* 스프레드 번호 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-brown-light/60">
            SP{String(spread.spreadNumber).padStart(2, "0")}
          </span>
          <span className="text-xs text-brown-pale">
            {currentSpread + 1} / {spreads.length}
          </span>
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-semibold text-brown mb-3 break-keep">
          {spread.title}
        </h3>

        {/* 본문 — 편집 모드 or 읽기 모드 */}
        {editingSpread === currentSpread ? (
          <SpreadEditor
            text={spread.text}
            onSave={(text) => onSaveEdit(currentSpread, text)}
            onCancel={onCancelEdit}
          />
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-brown leading-relaxed whitespace-pre-line break-keep">
              {spread.text}
            </p>
            <button
              onClick={() => onEdit(currentSpread)}
              className="text-[11px] text-brown-pale underline underline-offset-2
                         decoration-brown-pale/30 mt-2"
            >
              편집하기
            </button>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={currentSpread === 0}
          className="px-4 py-2 rounded-full text-xs font-medium text-brown-light
                     border border-brown-pale/30 disabled:opacity-30
                     active:scale-[0.97] transition-all"
        >
          ← 이전
        </button>

        <button
          onClick={onNext}
          disabled={currentSpread === spreads.length - 1}
          className="px-4 py-2 rounded-full text-xs font-medium text-white
                     disabled:opacity-30 active:scale-[0.97] transition-all"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
          }}
        >
          다음 →
        </button>
      </div>

      {/* 스프레드 목록 (썸네일) */}
      <div className="flex gap-1.5 overflow-x-auto py-2">
        {spreads.map((s, idx) => (
          <button
            key={s.spreadNumber}
            onClick={() => onSelect(idx)}
            className={`flex-shrink-0 w-8 h-8 rounded-lg text-[10px] font-medium
                       transition-all ${
                         idx === currentSpread
                           ? "bg-coral text-white scale-110"
                           : "bg-paper/60 text-brown-light"
                       }`}
          >
            {s.spreadNumber}
          </button>
        ))}
      </div>
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
        rows={5}
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

// ─── 메타데이터 섹션 ───

interface MetadataSectionProps {
  title: string;
  icon: string;
  content: string;
}

function MetadataSection({ title, icon, content }: MetadataSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image src={icon} alt={title} width={20} height={20} className="rounded object-cover" />
        <h3 className="text-sm font-semibold text-brown">{title}</h3>
      </div>
      <div className="bg-paper/60 rounded-2xl p-4">
        <div className="text-sm text-brown leading-relaxed whitespace-pre-line break-keep">
          {content}
        </div>
      </div>
    </div>
  );
}
