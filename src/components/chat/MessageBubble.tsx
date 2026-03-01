"use client";

import { PHASES } from "@/lib/constants/phases";
import { useSettingsStore, FONT_SIZE_MAP } from "@/lib/hooks/useSettings";
import type { Message } from "@/lib/types/chat";

interface MessageBubbleProps {
  message: Message;
  currentPhase: number;
}

// JP-09: CSS animation instead of framer-motion for simple fade+slide
export default function MessageBubble({
  message,
  currentPhase,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const mp = message.phase ? PHASES[message.phase] : PHASES[currentPhase];
  const fontSize = useSettingsStore((s) => s.fontSize);

  return (
    <div
      className="flex mb-3.5 animate-fade-slide-in"
      style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}
      aria-label={isUser ? "내 메시지" : "상담사 메시지"}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm mr-2 mt-1"
          style={{
            background: `${mp.accent}12`,
            border: `1px solid ${mp.accent}18`,
          }}
        >
          {mp.icon}
        </div>
      )}

      {/* Bubble */}
      <div
        className="max-w-[80%] px-4 py-[13px] whitespace-pre-wrap break-keep"
        style={{
          borderRadius: isUser
            ? "20px 20px 5px 20px"
            : "20px 20px 20px 5px",
          background: isUser
            ? `linear-gradient(135deg, ${mp.accent}, ${mp.accent}DD)`
            : "rgba(255,255,255,0.82)",
          color: isUser ? "#fff" : mp.text,
          fontSize: FONT_SIZE_MAP[fontSize],
          lineHeight: 1.8,
          fontWeight: isUser ? 400 : 300,
          fontFamily:
            message.phase === 4 && !isUser
              ? "'Nanum Myeongjo', 'Noto Serif KR', Georgia, serif"
              : undefined,
          boxShadow: isUser
            ? `0 3px 14px ${mp.accent}22`
            : "0 1px 6px rgba(0,0,0,0.03)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.5)",
        }}
      >
        {/* JP-11: Screen reader speaker identification */}
        <span className="sr-only">{isUser ? "나:" : "상담사:"}</span>
        {message.content}
      </div>
    </div>
  );
}
