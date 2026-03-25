"use client";

import { useState, useCallback, useEffect } from "react";
import { useWorksheetStore } from "@/lib/hooks/useWorksheetStore";
import { ACTIVITY_META } from "@/lib/worksheet/types";

export function ConfirmStep() {
  const store = useWorksheetStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [isFirstFree, setIsFirstFree] = useState(false);
  const [lastTicketConfirmed, setLastTicketConfirmed] = useState(false);

  const activityMeta = ACTIVITY_META.find((m) => m.type === store.activityType);

  // Fetch ticket count for inline display
  useEffect(() => {
    fetch("/api/tickets")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setTicketCount(d.worksheet_tickets_remaining ?? 0);
      })
      .catch(() => {});
    // Check if first free worksheet (no prior worksheets across all stories)
    fetch(`/api/teacher/worksheet?story_id=${store.storyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && (!d.worksheets || d.worksheets.length === 0)) setIsFirstFree(true);
      })
      .catch(() => {});
  }, [store.storyId]);

  // 생성 중 이탈 방지
  useEffect(() => {
    if (!isSubmitting) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isSubmitting]);

  const handleGenerate = useCallback(async () => {
    if (isSubmitting || !store.storyId || !store.activityType || !store.ageGroup || !store.contentFocus) return;

    setIsSubmitting(true);
    store.startGeneration();

    try {
      const res = await fetch("/api/teacher/worksheet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: store.storyId,
          activity_type: store.activityType,
          age_group: store.ageGroup,
          character_focus: store.characterFocus || "all",
          content_focus: store.contentFocus,
          output_style: store.outputStyle || undefined,
          extra_detail: store.extraDetail || undefined,
          is_recommended: store.isRecommended,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.code === "INSUFFICIENT_TICKETS") {
          store.setGenerationError("INSUFFICIENT_TICKETS");
          setIsSubmitting(false);
          return;
        }
        throw new Error(err.error || "활동지 생성에 실패했어요.");
      }

      const data = await res.json();
      store.setGenerationResult(data.html, data.nuri_domain, data.structured_data, data.activity_type);
      // ResultStep으로 직접 이동 (goNext()의 totalSteps 불일치 방지)
      const { currentStep } = useWorksheetStore.getState();
      store.goToStep(currentStep + 1);
    } catch (error) {
      store.setGenerationError(
        error instanceof Error ? error.message : "활동지 생성에 실패했어요."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, store]);

  const ageLabels: Record<string, string> = {
    age_3: "만 3세", age_4: "만 4세", age_5: "만 5세", mixed: "혼합반",
  };

  return (
    <div>
      <h3 className="text-[17px] font-medium text-brown mb-4">선택한 내용을 확인해주세요</h3>

      <div className="space-y-3 mb-6">
        <SummaryRow label="동화" value={store.storyTitle || "선택된 동화"} />
        <SummaryRow label="활동지" value={activityMeta?.name || store.activityType || ""} />
        <SummaryRow label="대상 연령" value={ageLabels[store.ageGroup || ""] || ""} />
        <SummaryRow label="캐릭터" value={store.characterFocus === "all" ? "모든 캐릭터" : store.characterFocus || ""} />
        <SummaryRow label="콘텐츠 초점" value={store.contentFocus || ""} />
        <SummaryRow label="출력 스타일" value={store.outputStyle || ""} />
        {store.extraDetail && <SummaryRow label="추가 설정" value={store.extraDetail} />}
      </div>

      {store.generationStatus === "error" && store.errorMessage === "INSUFFICIENT_TICKETS" && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[13px]">
          <p className="text-brown font-medium mb-2">활동지 티켓이 부족합니다</p>
          <p className="text-brown-light text-[12px] mb-3">활동지 1건당 티켓 1장이 필요해요.</p>
          <a
            href="/pricing?tab=worksheet&returnTo=teacher"
            className="inline-block px-4 py-2 rounded-full text-white text-[13px] font-medium"
            style={{ background: "linear-gradient(135deg, #7FBFB0, #6AAF9E)" }}
          >
            활동지 티켓 구매하기 (₩1,900~)
          </a>
        </div>
      )}

      {store.generationStatus === "error" && store.errorMessage !== "INSUFFICIENT_TICKETS" && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-[13px]">
          {store.errorMessage || "오류가 발생했어요."}
          <br />
          <span className="text-[12px] text-red-400">티켓은 차감되지 않았어요. 다시 시도해 주세요.</span>
        </div>
      )}

      {/* 티켓 차감 안내 (인라인) */}
      {ticketCount !== null && !isFirstFree && (
        <p className="text-[12px] text-brown-light text-center mb-2">
          🎟️ 티켓 1장 차감 · 남은 {ticketCount}장
        </p>
      )}
      {isFirstFree && (
        <p className="text-[12px] text-mint-deep font-medium text-center mb-2">
          첫 활동지는 무료예요!
        </p>
      )}

      {/* 마지막 1장 경고 */}
      {ticketCount === 1 && !isFirstFree && !lastTicketConfirmed && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[13px] text-center">
          <p className="text-brown font-medium mb-2">마지막 티켓입니다</p>
          <button
            onClick={() => setLastTicketConfirmed(true)}
            className="px-4 py-2 rounded-full text-white text-[13px] font-medium"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
          >
            사용하기
          </button>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isSubmitting || (ticketCount === 1 && !isFirstFree && !lastTicketConfirmed)}
        className="w-full py-4 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #E07A5F, #C96B52)",
          boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
        }}
      >
        {isSubmitting ? "만들고 있어요..." : "활동지 만들기"}
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-cream rounded-lg">
      <span className="text-[13px] text-brown-light">{label}</span>
      <span className="text-[14px] text-brown font-medium">{value}</span>
    </div>
  );
}
