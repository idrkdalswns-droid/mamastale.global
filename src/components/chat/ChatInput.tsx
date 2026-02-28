"use client";

import { useRef, useState, useCallback } from "react";
import { PHASES } from "@/lib/constants/phases";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  phase: number;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  isLoading,
  phase,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const p = PHASES[phase];

  const resize = useCallback(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 110) + "px";
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading || disabled) return;
    const text = input.trim();
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    onSend(text);
    setTimeout(() => taRef.current?.focus(), 150);
  }, [input, isLoading, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isDisabled = !input.trim() || isLoading || disabled;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-black/[0.04]"
      style={{
        background: "rgba(255,255,255,0.88)",
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
          placeholder={disabled ? "회원가입 후 계속 대화할 수 있어요" : "이야기를 들려주세요..."}
          rows={1}
          className="flex-1 resize-none rounded-[22px] px-4 py-3 text-base font-light leading-[1.55] outline-none placeholder:text-[#bbb]"
          style={{
            border: `1.5px solid ${p.accent}22`,
            background: "rgba(255,255,255,0.5)",
            color: "#444",
            transition: "border-color 0.3s",
            maxHeight: 110,
            WebkitAppearance: "none",
            fontSize: 16,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isDisabled}
          aria-label="메시지 보내기"
          className="w-[46px] h-[46px] rounded-full border-none flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer"
          style={{
            background: isDisabled
              ? "#E0D8D0"
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
    </div>
  );
}
