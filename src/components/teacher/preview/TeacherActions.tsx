"use client";

import React from "react";
import type { TeacherSpread } from "@/lib/types/teacher";

export interface TeacherActionsProps {
  storyId: string | undefined;
  storyTitle: string | undefined;
  spreads: TeacherSpread[];
  pdfLoading: string | null;
  pdfError: string | null;
  shareLoading: boolean;
  worksheetTicketsRemaining: number;
  onDownload: (type: "free-activity" | "activity" | "guide", format: "html" | "doc") => void;
  onShare: () => void;
  onEditStory?: () => void;
  onOpenWorksheet: () => void;
}

export function TeacherActions({
  storyId,
  spreads,
  pdfLoading,
  pdfError,
  shareLoading,
  onDownload,
  onShare,
  onEditStory,
  onOpenWorksheet,
}: TeacherActionsProps) {
  return (
    <>
      {/* ─── AI 맞춤 활동지 CTA ─── */}
      {storyId && (
        <div className="px-4 pt-3">
          <button
            onClick={onOpenWorksheet}
            className="w-full py-3 rounded-xl text-[14px] font-medium text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #8B6AAF, #7A5BA0)",
              boxShadow: "0 4px 16px rgba(139,106,175,0.25)",
            }}
          >
            <svg className="inline-block w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>AI 맞춤 활동지 만들기
          </button>
        </div>
      )}

      {/* ─── 학부모 공유 ─── */}
      {storyId && (
        <div className="px-4 pt-2">
          <button
            onClick={onShare}
            disabled={shareLoading || spreads.length === 0}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-brown
                       border border-brown-pale/30 transition-all active:scale-[0.97]
                       bg-paper/40 disabled:opacity-40"
          >
            {shareLoading ? (
              <span className="animate-pulse">링크 생성 중...</span>
            ) : (
              <>🔗 학부모에게 공유하기</>
            )}
          </button>
        </div>
      )}

      {/* ─── 하단 CTA 영역 ─── */}
      <div className="px-4 pb-4 pt-2 border-t border-brown-pale/20 space-y-3
                       pb-[max(1rem,env(safe-area-inset-bottom,0px))]">

        {/* 편집 CTA */}
        {onEditStory && (
          <button
            onClick={onEditStory}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-brown
                       border border-brown-pale/30 transition-all active:scale-[0.97]
                       bg-paper/40"
          >
            <svg className="inline-block w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
            편집
          </button>
        )}

        {/* 활동지 + 다운로드 */}
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
              onClick={() => onDownload("free-activity", "html")}
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
                <><svg className="inline-block w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>인쇄 / PDF 저장</>
              )}
            </button>
            <button
              onClick={() => onDownload("free-activity", "doc")}
              disabled={!!pdfLoading || spreads.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl
                         text-sm font-medium text-brown border border-brown-pale/30
                         transition-all active:scale-[0.97] disabled:opacity-40
                         bg-paper/60"
            >
              {pdfLoading === "free-activity-doc" ? (
                <span className="animate-pulse text-brown-light">생성 중...</span>
              ) : (
                <><svg className="inline-block w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>DOCX 다운로드</>
              )}
            </button>
          </div>
          {/* C7: PDF/DOCX 형식 차이 안내 */}
          <p className="text-[11px] text-brown-pale text-center mt-2">
            PDF: 바로 인쇄 가능 · DOCX: 내용 편집 후 인쇄
          </p>
          {spreads.length === 0 && (
            <p className="text-[10px] text-brown-pale text-center mt-1">
              동화를 먼저 완성해주세요
            </p>
          )}
        </div>
      </div>
    </>
  );
}
