"use client";

interface DraftBannerProps {
  phase: number;
  messageCount: number;
  savedAt: number;
  onRestore: () => void;
  onDelete: () => void;
}

function formatRelativeTime(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export function DraftBanner({ phase, messageCount, savedAt, onRestore, onDelete }: DraftBannerProps) {
  return (
    <div
      className="rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.15)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-brown">진행 중인 대화가 있어요</p>
          <p className="text-[11px] text-brown-pale font-light">
            {phase}단계 · {messageCount}개의 메시지
            {savedAt > 0 && <> · {formatRelativeTime(savedAt)}</>}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRestore}
          className="flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
        >
          이어서 대화하기
        </button>
        {/* Fix 2-1: Replace native confirm() with inline confirmation */}
        <button
          onClick={onDelete}
          className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-light text-red-400 transition-all"
          style={{ border: "1px solid rgba(224,122,95,0.2)" }}
          aria-label="저장된 대화 삭제"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
