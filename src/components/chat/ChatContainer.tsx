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
                    options: { redirectTo: `${window.location.origin}/api/auth/callback` },
                  });
                }
              }}
              className="block w-full py-3.5 rounded-full text-sm font-medium transition-transform active:scale-[0.97] mb-2"
              style={{ background: "#FEE500", color: "#3C1E1E" }}
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
                const supabase = createClient();
                if (supabase) {
                  supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${window.location.origin}/api/auth/callback` },
                  });
                }
              }}
              className="block w-full py-3 rounded-full text-sm font-medium transition-transform active:scale-[0.97] mb-2"
              style={{ background: "#fff", color: "#444", border: "1.5px solid rgba(0,0,0,0.1)" }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 이어가기
              </span>
            </button>
            <button
              onClick={() => {
                persistToStorage();
                router.push("/signup");
              }}
              className="block w-full py-2.5 text-xs font-light text-brown-mid transition-all"
            >
              이메일로 회원가입
            </button>
            <button
              onClick={() => {
                persistToStorage();
                router.push("/login");
              }}
              className="block w-full py-2 text-xs font-light text-brown-pale transition-all"
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
