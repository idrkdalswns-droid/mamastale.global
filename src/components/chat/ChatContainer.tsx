"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { SignupModal } from "@/components/auth/SignupModal";

const GUEST_TURN_LIMIT = 5;

interface ChatPageProps {
  onComplete: () => void;
  onGoHome: () => void;
}

export function ChatPage({ onComplete, onGoHome }: ChatPageProps) {
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
    saveDraft,
  } = useChatStore();

  const router = useRouter();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);

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
        onGoHome={() => {
          const userMsgCount = messages.filter(m => m.role === "user").length;
          if (userMsgCount > 0 && !storyDone) {
            setShowHomeConfirm(true);
          } else {
            onGoHome();
          }
        }}
        onSaveDraft={() => {
          saveDraft();
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 2000);
        }}
      />

      {/* Phase transition overlay */}
      <PhaseTransition isVisible={isTransitioning} phase={currentPhase} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="max-w-3xl mx-auto px-3.5 pt-4 pb-[150px]" role="log" aria-label="대화 메시지">
          {messages.map((m) => (
            <MessageBubble key={m.id || `msg_${m.role}_${m.content.slice(0, 20)}_${messages.indexOf(m)}`} message={m} currentPhase={currentPhase} />
          ))}

          {isLoading && <TypingIndicator phase={currentPhase} />}
        </div>
      </div>

      {/* Guest turn counter — show remaining free messages */}
      {isGuest && !guestLimitReached && !storyDone && userMsgCount > 0 && (
        <div className="absolute top-[70px] right-3 z-[60]">
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-medium"
            style={{
              background: userMsgCount >= 2 ? "rgba(224,122,95,0.12)" : "rgba(0,0,0,0.04)",
              color: userMsgCount >= 2 ? "#E07A5F" : "#999",
            }}
          >
            무료 대화 {userMsgCount}/{GUEST_TURN_LIMIT}회
            {userMsgCount === GUEST_TURN_LIMIT - 1 && " · 마지막"}
          </div>
        </div>
      )}

      {/* Phase rule hint — hide when story is done (HIGH-4 fix) */}
      {!storyDone && !guestLimitReached && <PhaseRuleHint phase={currentPhase} />}

      {/* Guest turn limit reached — signup prompt (wait for last response before showing) */}
      {guestLimitReached && !storyDone && !isLoading && (
        <div
          className="absolute inset-0 z-[80] flex items-end justify-center pb-[160px]"
          role="dialog"
          aria-modal="true"
          aria-label="회원가입 안내"
          onKeyDown={(e) => { if (e.key === "Escape") router.push("/"); }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-3xl p-7 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
            }}
          >
            <div className="text-[48px] mb-3">🌿</div>
            <h3 className="font-serif text-lg font-bold text-brown mb-2 leading-tight">
              이야기가 깊어지고 있어요
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-2 break-keep">
              지금 꺼내주신 마음, 정말 소중합니다.<br />
              회원가입 후 <span className="text-coral font-medium">이 대화를 그대로 이어서</span><br />
              나만의 마음 동화를 완성할 수 있어요.
            </p>
            <p className="text-[11px] text-brown-pale font-light mb-5">
              대화 내용은 안전하게 보관됩니다
            </p>
            {/* S7-03: Primary CTA style for signup — conversion critical */}
            <button
              onClick={() => setShowSignupModal(true)}
              className="block w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] mb-2"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              회원가입하고 이어서 만들기
            </button>
            <button
              onClick={() => {
                persistToStorage();
                router.push("/login");
              }}
              className="block w-full py-2.5 text-xs font-light text-brown-mid transition-all"
            >
              이미 계정이 있으신가요? <span className="text-coral font-medium">로그인</span>
            </button>
            <p className="text-[10px] text-brown-pale font-light text-center mt-2">
              카카오 · Google 로그인은 곧 지원됩니다
            </p>
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

      {/* Save draft toast */}
      {showSaveToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-2 duration-300">
          <div
            className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg"
            style={{ background: "rgba(90,158,143,0.92)", backdropFilter: "blur(8px)" }}
          >
            대화가 저장되었어요
          </div>
        </div>
      )}

      {/* Home confirm dialog */}
      {showHomeConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="홈으로 나가기"
        >
          <div
            className="w-full max-w-xs rounded-2xl p-6 text-center"
            style={{ background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
          >
            <h3 className="font-serif text-base font-bold text-brown mb-2">대화를 나가시겠어요?</h3>
            <p className="text-xs text-brown-light font-light mb-5 leading-relaxed">
              저장하지 않으면 대화 내용이 사라져요.
            </p>
            <button
              onClick={() => {
                saveDraft();
                setShowHomeConfirm(false);
                onGoHome();
              }}
              className="w-full py-3 rounded-full text-sm font-medium text-white mb-2 transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
            >
              저장하고 나가기
            </button>
            <button
              onClick={() => { setShowHomeConfirm(false); onGoHome(); }}
              className="w-full py-2.5 text-xs font-light text-brown-pale"
            >
              저장 없이 나가기
            </button>
            <button
              onClick={() => setShowHomeConfirm(false)}
              className="w-full py-2 text-xs font-light text-brown-pale mt-1"
            >
              계속 대화하기
            </button>
          </div>
        </div>
      )}

      {/* Signup modal — overlays chat without losing context */}
      {showSignupModal && (
        <SignupModal onClose={() => setShowSignupModal(false)} />
      )}
    </div>
  );
}
