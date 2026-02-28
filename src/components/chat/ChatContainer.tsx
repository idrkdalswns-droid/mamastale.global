"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { PHASES } from "@/lib/constants/phases";
import Link from "next/link";
import PhaseHeader from "./PhaseHeader";
import PhaseTransition from "./PhaseTransition";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import PhaseRuleHint from "./PhaseRuleHint";
import StoryCompleteCTA from "./StoryCompleteCTA";

const GUEST_TURN_LIMIT = 3;

interface ChatPageProps {
  onComplete: () => void;
}

export function ChatPage({ onComplete }: ChatPageProps) {
  const {
    messages,
    currentPhase,
    visitedPhases,
    isLoading,
    isTransitioning,
    storyDone,
    completedStoryId,
    sendMessage,
    initSession,
  } = useChatStore();

  const { user, loading: authLoading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Count user messages for guest turn limit
  const userMsgCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );
  const isGuest = !authLoading && !user;
  const guestLimitReached = isGuest && userMsgCount >= GUEST_TURN_LIMIT;

  useEffect(() => {
    initSession(`session_${Date.now()}`);
  }, [initSession]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const p = PHASES[currentPhase];

  return (
    <div
      className="h-dvh flex flex-col font-sans relative transition-colors duration-700"
      style={{ background: p.bg }}
    >
      {/* Header */}
      <PhaseHeader
        currentPhase={currentPhase}
        visitedPhases={visitedPhases}
        isTransitioning={isTransitioning}
      />

      {/* Phase transition overlay */}
      <PhaseTransition isVisible={isTransitioning} phase={currentPhase} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3.5 pt-4 pb-[150px]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {messages.map((m) => (
          <MessageBubble key={m.id || m.content.slice(0, 20)} message={m} currentPhase={currentPhase} />
        ))}

        {isLoading && <TypingIndicator phase={currentPhase} />}
      </div>

      {/* Phase rule hint — hide when story is done (HIGH-4 fix) */}
      {!storyDone && !guestLimitReached && <PhaseRuleHint phase={currentPhase} />}

      {/* Guest turn limit reached — signup prompt */}
      {guestLimitReached && !storyDone && (
        <div className="absolute inset-0 z-[80] flex items-end justify-center pb-[160px]">
          <div
            className="mx-4 w-full max-w-sm rounded-3xl p-7 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
            }}
          >
            <div className="text-[48px] mb-3">🌿</div>
            <h3 className="font-serif text-lg font-bold text-brown mb-2 leading-tight">
              대화가 마음에 드시나요?
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-5 break-keep">
              더 대화를 지속하길 원하시는 경우<br />
              <span className="text-coral font-medium">회원가입을 통해 티켓 1장을 무료로</span><br />
              받아보세요.
            </p>
            <Link
              href="/signup"
              className="block w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97] mb-3"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              무료 회원가입하기
            </Link>
            <Link
              href="/login"
              className="block w-full py-3 rounded-full text-sm font-light text-brown-mid no-underline transition-all"
              style={{ border: "1px solid rgba(196,149,106,0.2)" }}
            >
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </div>
      )}

      {/* Story complete CTA */}
      {storyDone && (
        <StoryCompleteCTA
          storyId={completedStoryId || ""}
          onViewStory={onComplete}
        />
      )}

      {/* Input bar — disabled when guest limit reached */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        phase={currentPhase}
        disabled={guestLimitReached}
      />
    </div>
  );
}
