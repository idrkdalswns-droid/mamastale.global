"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { PHASES } from "@/lib/constants/phases";
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
    persistToStorage,
  } = useChatStore();

  const router = useRouter();

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
              회원가입 후 <span className="text-coral font-medium">지금 대화를 이어서</span><br />
              나만의 치유 동화를 완성할 수 있어요.
            </p>
            <button
              onClick={() => {
                persistToStorage();
                const supabase = createClient();
                if (supabase) {
                  supabase.auth.signInWithOAuth({
                    provider: "kakao",
                    options: {
                      redirectTo: `${window.location.origin}/api/auth/callback`,
                    },
                  });
                }
              }}
              className="block w-full py-3.5 rounded-full text-sm font-medium transition-transform active:scale-[0.97] mb-3"
              style={{
                background: "#FEE500",
                color: "#3C1E1E",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
                </svg>
                카카오로 3초 만에 이어가기
              </span>
            </button>
            <button
              onClick={() => {
                persistToStorage();
                router.push("/signup");
              }}
              className="block w-full py-3 rounded-full text-sm font-light text-brown-mid transition-all"
              style={{ border: "1px solid rgba(196,149,106,0.2)" }}
            >
              이메일로 회원가입
            </button>
            <button
              onClick={() => {
                persistToStorage();
                router.push("/login");
              }}
              className="block w-full py-2.5 text-xs font-light text-brown-pale transition-all"
            >
              이미 계정이 있으신가요? 로그인
            </button>
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
