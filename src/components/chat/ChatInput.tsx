"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import { PHASES } from "@/lib/constants/phases";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  phase: number;
  disabled?: boolean;
}

export default memo(function ChatInput({
  onSend,
  isLoading,
  phase,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  // ROUND1-FIX: Ref-based mutex to prevent duplicate sends from rapid button taps.
  // React state (isLoading) updates asynchronously, so rapid clicks can slip through.
  const sendingRef = useRef(false);
  // Fix 1: Timestamp-based debounce to prevent Android WebView touch double-fire
  const lastSendRef = useRef(0);
  // Fix 6: Track loading duration for time-based escalation feedback
  const loadingStartRef = useRef(0);
  const [loadingHint, setLoadingHint] = useState<string | null>(null);

  // Release send lock when loading completes (replaces fragile 500ms timeout)
  useEffect(() => {
    if (!isLoading) {
      sendingRef.current = false;
      setLoadingHint(null);
      loadingStartRef.current = 0;
    }
  }, [isLoading]);

  // Fix 6: Time-based escalation feedback during loading
  useEffect(() => {
    if (!isLoading) return;
    loadingStartRef.current = Date.now();

    const t5 = setTimeout(() => setLoadingHint("AI가 생각하고 있어요..."), 5_000);
    const t15 = setTimeout(() => setLoadingHint("응답이 지연되고 있어요."), 15_000);

    return () => {
      clearTimeout(t5);
      clearTimeout(t15);
    };
  }, [isLoading]);

  const p = PHASES[phase];

  const PHASE_PLACEHOLDERS: Record<number, string> = {
    1: "오늘의 마음을 편하게 이야기해 주세요...",
    2: "떠오르는 생각을 자유롭게 적어주세요...",
    3: "어떤 캐릭터가 떠오르시나요?",
    4: "동화에 담고 싶은 이야기를 적어주세요...",
  };

  const resize = useCallback(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 110) + "px";
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading || disabled || sendingRef.current) return;
    // Fix 1: 350ms timestamp debounce for Android WebView touch double-fire (reduced from 800ms for snappier UX)
    if (Date.now() - lastSendRef.current < 350) return;
    lastSendRef.current = Date.now();
    sendingRef.current = true;
    const text = input.trim();
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    onSend(text);
    setTimeout(() => taRef.current?.focus(), 150);
  }, [input, isLoading, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Prevent sending during Korean IME composition (한글 조합 중 전송 방지)
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      // Mobile: Enter creates newline (send via button only)
      // Desktop: Enter sends (Shift+Enter for newline)
      // Bug Bounty Fix 2-17: Use hover/pointer media query instead of ontouchstart
      // to correctly handle touchscreen laptops (Surface Pro) with physical keyboards.
      const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (isTouchDevice) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isDisabled = !input.trim() || isLoading || disabled;

  // Fix 6: Determine placeholder during loading
  const placeholder = disabled
    ? "체험이 종료되었습니다"
    : isLoading
      ? loadingHint || "보내는 중..."
      : PHASE_PLACEHOLDERS[phase] || "이야기를 들려주세요...";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-black/[0.04]"
      role="region"
      aria-label="메시지 입력 영역"
      style={{
        background: "rgb(var(--surface) / 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        className="max-w-[430px] mx-auto flex gap-2 items-end px-3 pt-2"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 8px)",
        }}
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            e.target.style.borderColor = `${p.accent}55`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = `${p.accent}22`;
          }}
          disabled={disabled}
          aria-label="메시지 입력"
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-[22px] px-4 py-3 text-base font-light leading-[1.55] outline-none placeholder:text-[#bbb]"
          style={{
            border: `1.5px solid ${isLoading ? `${p.accent}44` : `${p.accent}22`}`,
            background: "rgb(var(--surface) / 0.5)",
            transition: "border-color 0.3s, opacity 0.3s",
            maxHeight: 110,
            WebkitAppearance: "none",
            fontSize: 16,
            opacity: isLoading ? 0.7 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isDisabled}
          aria-label="메시지 보내기"
          className="w-[46px] h-[46px] rounded-full border-none flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer"
          style={{
            background: isDisabled
              ? "rgb(var(--brown-pale) / 0.3)"
              : `linear-gradient(135deg, ${p.accent}, ${p.accent}CC)`,
            color: "#fff",
            boxShadow:
              !isDisabled ? `0 3px 12px ${p.accent}28` : "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
      {/* R7: Screen reader loading announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? (loadingHint || "AI가 응답을 작성하고 있습니다") : ""}
      </div>
    </div>
  );
});
