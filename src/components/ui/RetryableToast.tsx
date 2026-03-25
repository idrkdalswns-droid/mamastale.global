import toast from "react-hot-toast";

/**
 * 재시도 버튼이 포함된 에러 토스트를 표시합니다.
 * 사용자가 직접 닫기 전까지 유지됩니다 (duration: Infinity).
 */
export function showRetryToast(message: string, onRetry: () => void) {
  toast.custom(
    (t) => (
      <div
        className={`${t.visible ? "animate-enter" : "animate-leave"}
          max-w-xs w-full bg-white shadow-lg rounded-xl pointer-events-auto
          flex items-center gap-3 px-4 py-3 border border-red-100`}
      >
        <p className="flex-1 text-sm text-brown font-medium">{message}</p>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onRetry();
          }}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white
                     bg-coral active:scale-[0.95] transition-transform"
        >
          다시 시도
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-brown-pale hover:text-brown transition-colors"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    ),
    { duration: Infinity }
  );
}
