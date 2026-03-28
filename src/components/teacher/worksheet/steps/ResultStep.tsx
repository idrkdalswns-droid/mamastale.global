"use client";

import { useCallback, useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { AGE_PARAMS } from "@/lib/worksheet/age-params";
import type { AgeGroup, ActivityType } from "@/lib/worksheet/types";

/** DOCX 빌더가 구현된 활동지 타입 */
const DOCX_SUPPORTED = new Set<ActivityType>([
  "emotion", "post_reading", "coloring", "vocabulary",
  "character_card", "story_map", "what_if", "speech_bubble", "roleplay_script",
]);

export function ResultStep() {
  const {
    generatedHtml, nuriDomain, storyTitle,
    structuredData, activityTypeUsed, ageGroup,
    close, reset,
  } = useWorksheetStore();

  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  // F-003: DOMPurify로 XSS 방어 (스크립트/이벤트 핸들러 제거, HTML 구조/CSS 보존)
  const sanitizedHtml = useMemo(
    () => generatedHtml ? DOMPurify.sanitize(generatedHtml) : "",
    [generatedHtml],
  );

  const handlePrint = useCallback(() => {
    if (!generatedHtml) return;

    // iframe 방식 (팝업 차단 회피)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    // R2 FIX: Safe iframe removal helper
    const removeIframe = () => {
      try {
        if (iframe.parentNode) document.body.removeChild(iframe);
      } catch { /* already removed */ }
    };

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(generatedHtml);
      doc.close();

      // R2 FIX: Error handler for iframe load failure
      iframe.onerror = removeIframe;

      // 폰트 로딩 완료 대기 후 인쇄
      iframe.onload = () => {
        const printTimer = setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch { /* print dialog cancelled or failed */ }
          const cleanupTimer = setTimeout(removeIframe, 1000);
          // Fallback: ensure cleanup even if timer somehow leaks
          if (typeof cleanupTimer === "number") void cleanupTimer;
        }, 500);
        if (typeof printTimer === "number") void printTimer;
      };

      // R2 FIX: Fallback — remove iframe after 10s no matter what
      setTimeout(removeIframe, 10_000);
    } else {
      removeIframe();
    }
  }, [generatedHtml]);

  const handleDocxDownload = useCallback(async () => {
    if (!structuredData || !activityTypeUsed) {
      setDocxError("Word 파일을 생성할 수 없어요. 인쇄 기능을 이용해 주세요.");
      return;
    }

    setDocxLoading(true);
    setDocxError(null);

    try {
      // Dynamic import for bundle splitting (~500KB)
      const { buildWorksheetDocx } = await import("@/lib/worksheet/docx/builder");

      const derivedParams = AGE_PARAMS[ageGroup as AgeGroup] || AGE_PARAMS.age_5;
      const docTitle = (structuredData as Record<string, string>)?.title || storyTitle || "활동지";
      const docNuri = nuriDomain || "사회관계";
      const blob = await buildWorksheetDocx(
        activityTypeUsed as Parameters<typeof buildWorksheetDocx>[0],
        structuredData,
        docTitle,
        docNuri,
        derivedParams,
      );

      // Download blob as .docx
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storyTitle || "활동지"}_${activityTypeUsed}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[worksheet] DOCX generation failed:", err);
      setDocxError("Word 다운로드에 실패했어요. 인쇄 기능을 이용해 주세요.");
    } finally {
      setDocxLoading(false);
    }
  }, [structuredData, activityTypeUsed, storyTitle, ageGroup]);

  const handleNewWorksheet = useCallback(() => {
    const storyId = useWorksheetStore.getState().storyId;
    const title = useWorksheetStore.getState().storyTitle;
    reset();
    if (storyId && title) {
      useWorksheetStore.getState().open(storyId, title);
    }
  }, [reset]);

  if (!generatedHtml) {
    return (
      <div className="text-center py-8" aria-live="polite">
        <p className="text-brown-light">활동지를 생성하고 있어요...</p>
      </div>
    );
  }

  return (
    <div aria-live="polite">
      <div className="text-center mb-4">
        <div className="text-3xl mb-2">🎉</div>
        <h3 className="text-[17px] font-medium text-brown">활동지가 완성됐어요!</h3>
        {nuriDomain && (
          <span className="inline-block mt-2 text-[12px] bg-mint-deep/20 text-mint-deep px-3 py-1 rounded-full">
            누리과정: {nuriDomain}
          </span>
        )}
      </div>

      {/* 미리보기 (축소 — 7-Pass UX-1 반영: scale 0.5 + overflow-auto) */}
      <div className="mb-4 border border-brown-pale/30 rounded-xl overflow-hidden bg-white">
        <div
          className="transform scale-[0.5] origin-top-left w-[200%] h-[300px] overflow-auto pointer-events-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>

      {/* PDF 저장 버튼 */}
      <button
        onClick={handlePrint}
        className="w-full py-4 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] mb-1"
        style={{
          background: "linear-gradient(135deg, #E07A5F, #C96B52)",
          boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
        }}
      >
        📄 PDF로 저장하기
      </button>
      <p className="text-[11px] text-brown-pale text-center mb-3">
        인쇄 대화상자에서 &apos;대상&apos;을 &apos;PDF로 저장&apos;으로 선택하세요
      </p>

      {/* Word 다운로드 버튼 */}
      {DOCX_SUPPORTED.has(activityTypeUsed as ActivityType) ? (
        <button
          onClick={handleDocxDownload}
          disabled={docxLoading}
          className="w-full py-3 rounded-full text-[14px] font-medium transition-all active:scale-[0.97] mb-3 border-2"
          style={{
            color: "#8B6AAF",
            borderColor: "#C8B8D8",
            background: docxLoading ? "#F5F0FA" : "white",
          }}
        >
          {docxLoading ? "⏳ 문서 만드는 중..." : "📝 Word(.docx)로 저장 — 편집 가능"}
        </button>
      ) : (
        <button
          disabled
          className="w-full py-3 rounded-full text-[14px] font-medium mb-3 border-2 opacity-50 cursor-not-allowed"
          style={{
            color: "#8B6AAF",
            borderColor: "#C8B8D8",
            background: "#F5F0FA",
          }}
        >
          📝 Word 저장 (준비 중)
        </button>
      )}

      {docxError && (
        <p className="text-xs text-red-500 text-center mb-2 break-keep">{docxError}</p>
      )}

      {/* 다시 만들기 */}
      <button
        onClick={handleNewWorksheet}
        className="w-full py-3 rounded-full text-brown text-[14px] font-medium border border-brown-pale/30 transition-all active:scale-[0.97]"
      >
        다른 활동지 만들기
      </button>

      {/* 닫기 */}
      <button
        onClick={close}
        className="w-full mt-2 text-[13px] text-brown-pale underline underline-offset-2"
      >
        닫기
      </button>
    </div>
  );
}
