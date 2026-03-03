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
import PremiumUpgradeCTA from "./PremiumUpgradeCTA";
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
    completedScenes,
    storySaved,
    storySaveError,
    isPremiumStory,
    sendMessage,
    initSession,
    persistToStorage,
    saveDraft,
    retrySaveStory,
  } = useChatStore();

  const router = useRouter();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPremiumUpgrade, setShowPremiumUpgrade] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  // P2-FIX(IL-1): Track if user scrolled up (to avoid disrupting reading)
  const [showScrollDown, setShowScrollDown] = useState(false);
  const userScrolledRef = useRef(false);
  // P3-FIX(IL-4): Delayed guest signup modal (1.5s after AI responds)
  const [guestModalReady, setGuestModalReady] = useState(false);

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

  // P3-FIX(IL-4): Show guest signup modal after 1.5s delay (let user read last AI response)
  useEffect(() => {
    if (guestLimitReached && !storyDone && !isLoading && !guestModalReady) {
      const timer = setTimeout(() => setGuestModalReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [guestLimitReached, storyDone, isLoading, guestModalReady]);

  // P2-FIX(IL-1): Only auto-scroll if user hasn't manually scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && !userScrolledRef.current) {
      el.scrollTop = el.scrollHeight;
    } else if (el && userScrolledRef.current) {
      setShowScrollDown(true);
    }
  }, [messages, isLoading]);

  // When story is done, scroll to bottom so farewell message is visible,
  // then auto-show celebration after 5 seconds
  useEffect(() => {
    if (storyDone && completedScenes.length > 0 && !showCelebration) {
      const el = scrollRef.current;
      if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 300);
      const timer = setTimeout(() => setShowCelebration(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [storyDone, completedScenes, showCelebration]);

  // P2-FIX(IL-1): Track scroll position to detect user scrolling up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledRef.current = !nearBottom;
    if (nearBottom) setShowScrollDown(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      userScrolledRef.current = false;
      setShowScrollDown(false);
    }
  }, []);

  // P3-FIX(IL-2): Detect last error message for retry button
  const lastMessage = messages[messages.length - 1];
  const hasErrorMessage = lastMessage?.isError === true;

  const handleSend = useCallback(
    (text: string) => {
      // Reset scroll tracking on new message
      userScrolledRef.current = false;
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
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto px-3.5 pt-4 pb-[150px]" role="log" aria-label="대화 메시지">
          {messages.map((m, idx) => (
            <MessageBubble key={m.id || `msg_${m.role}_${idx}`} message={m} currentPhase={currentPhase} />
          ))}

          {isLoading && <TypingIndicator phase={currentPhase} />}
        </div>
      </div>

      {/* Guest turn counter — show remaining free messages */}
      {/* P3-FIX(IL-3): Enhanced warning at 4/5 messages for conversion */}
      {isGuest && !guestLimitReached && !storyDone && userMsgCount > 0 && (
        <div className="absolute top-[70px] right-3 z-[60]">
          <div
            className="px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all duration-300"
            style={{
              background: userMsgCount >= GUEST_TURN_LIMIT - 1
                ? "rgba(224,122,95,0.25)"
                : userMsgCount >= 2
                  ? "rgba(224,122,95,0.12)"
                  : "rgba(0,0,0,0.04)",
              color: userMsgCount >= 2 ? "#E07A5F" : "#999",
              border: userMsgCount >= GUEST_TURN_LIMIT - 1 ? "1.5px solid rgba(224,122,95,0.4)" : "1px solid transparent",
              animation: userMsgCount >= GUEST_TURN_LIMIT - 1 ? "pulse 2s ease-in-out infinite" : "none",
            }}
          >
            {userMsgCount >= GUEST_TURN_LIMIT - 1 ? "⚡ " : ""}
            무료 대화 {userMsgCount}/{GUEST_TURN_LIMIT}회
            {userMsgCount === GUEST_TURN_LIMIT - 1 && " · 마지막 무료 대화예요!"}
          </div>
        </div>
      )}

      {/* Phase rule hint — hide when story is done (HIGH-4 fix) */}
      {!storyDone && !guestLimitReached && <PhaseRuleHint phase={currentPhase} />}

      {/* Guest turn limit reached — signup prompt
          P3-FIX(IL-4): 1.5s delay after last AI response to let user read it */}
      {guestModalReady && !storyDone && (
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
            <div className="flex items-center justify-center gap-3 my-3 text-[11px] text-brown-mid font-medium">
              <span>✅ 대화 이어가기</span>
              <span>✅ 영구 보관</span>
              <span>✅ 무료 1회</span>
            </div>
            <p className="text-[11px] text-brown-pale font-light mb-4">
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
              카카오 · Google로도 간편 가입 가능
            </p>
          </div>
        </div>
      )}

      {/* "다음" button — shown after story is done, before celebration */}
      {storyDone && completedScenes.length > 0 && !showCelebration && (
        <div className="sticky bottom-0 z-[60] bg-white/90 backdrop-blur-xl border-t border-black/[0.04]">
          <div className="max-w-3xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)]">
            <button
              onClick={() => setShowCelebration(true)}
              className="w-full py-4 rounded-full text-white text-base font-medium transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
              }}
            >
              다음 →
            </button>
          </div>
        </div>
      )}

      {/* Story complete celebration — only after user reads farewell */}
      {showCelebration && !showPremiumUpgrade && (
        <StoryCompleteCTA
          storyId={completedStoryId || ""}
          onViewStory={() => {
            // For non-premium stories, show upgrade CTA before navigating
            if (!isPremiumStory && user) {
              setShowPremiumUpgrade(true);
            } else {
              onComplete();
            }
          }}
        />
      )}

      {/* Premium upgrade CTA — shown after free/standard story completion */}
      {showPremiumUpgrade && (
        <PremiumUpgradeCTA
          trigger="story_complete"
          onClose={() => {
            setShowPremiumUpgrade(false);
            onComplete();
          }}
          onViewStory={onComplete}
        />
      )}

      {/* Story save error indicator */}
      {storyDone && storySaveError && !storySaved && (
        <div className="fixed bottom-[140px] left-1/2 -translate-x-1/2 z-[75] w-[90%] max-w-sm">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", backdropFilter: "blur(8px)" }}
          >
            <p className="text-sm text-brown font-medium mb-2">
              {storySaveError === "login_required" ? "동화 저장을 위해 로그인이 필요해요" :
               storySaveError === "no_tickets" ? "티켓이 부족하여 저장할 수 없어요" :
               "동화 저장에 실패했어요"}
            </p>
            <button
              onClick={() => retrySaveStory()}
              className="px-5 py-2 rounded-full text-xs font-medium text-white transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
            >
              다시 저장하기
            </button>
          </div>
        </div>
      )}

      {/* Story done but no scenes parsed — show error instead of celebration */}
      {storyDone && completedScenes.length === 0 && !isLoading && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-6"
          style={{ background: "rgba(253,249,244,0.88)", backdropFilter: "blur(14px)" }}
        >
          <div className="w-full max-w-sm text-center">
            <div className="text-[48px] mb-4">😢</div>
            <h2 className="font-serif text-xl font-bold text-brown mb-2">
              동화 생성에 문제가 발생했어요
            </h2>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
              대화는 잘 마무리되었지만<br />
              동화 장면을 만들지 못했어요.<br />
              다시 시도해 주세요.
            </p>
            <button
              onClick={() => onGoHome()}
              className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* P2-FIX(IL-1): "↓ 새 메시지" floating scroll button */}
      {showScrollDown && !storyDone && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[65] px-4 py-2 rounded-full text-xs font-medium text-white shadow-lg transition-all active:scale-95"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
          ↓ 새 메시지
        </button>
      )}

      {/* P3-FIX(IL-2): Error retry button — shown when last message is an error */}
      {hasErrorMessage && !isLoading && !storyDone && (
        <div className="sticky bottom-[80px] z-[60] flex justify-center pb-2">
          <button
            onClick={() => {
              // Remove the error message and resend the last user message
              const lastUserMsg = [...messages].reverse().find(m => m.role === "user" && !m.isError);
              if (lastUserMsg) {
                // Remove error messages from the end
                const cleaned = messages.filter(m => !m.isError);
                useChatStore.setState({ messages: cleaned });
                sendMessage(lastUserMsg.content);
              }
            }}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
            }}
          >
            🔄 다시 시도하기
          </button>
        </div>
      )}

      {/* Input bar — hidden when story is done */}
      {!storyDone && (
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          phase={currentPhase}
          disabled={guestLimitReached}
        />
      )}

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
