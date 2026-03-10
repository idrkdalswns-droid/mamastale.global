"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import TurnFivePopup from "./TurnFivePopup";
import { usePresence } from "@/lib/hooks/usePresence";

const FREE_TURN_LIMIT = 3;

interface ChatPageProps {
  onComplete: () => void;
  onGoHome: () => void;
  /** When true, 3-turn free trial limit applies (no ticket consumed yet) */
  freeTrialMode?: boolean;
  /** Current ticket balance (for inline ticket deduction in TurnFivePopup) */
  ticketsRemaining?: number | null;
  /** Called when ticket is deducted inline during chat (lifts free trial limit) */
  onTicketUsed?: () => void;
}

export function ChatPage({ onComplete, onGoHome, freeTrialMode = false, ticketsRemaining, onTicketUsed }: ChatPageProps) {
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

  // Track this user as "creating a story" for live presence counting
  usePresence("chat");

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
  const [turnFiveReady, setGuestModalReady] = useState(false);

  // Count user messages for guest turn limit
  const userMsgCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );
  const isGuest = !authLoading && !user;
  // Free trial limit: applies to guests always, and logged-in users in freeTrialMode
  const freeLimitReached = freeTrialMode && userMsgCount >= FREE_TURN_LIMIT;

  useEffect(() => {
    initSession(`session_${Date.now()}`);
  }, [initSession]);

  // ── DEFENSE LAYER 1: Auto-save chat on page unload ──
  // Catches ALL navigation scenarios: OAuth redirect, back button, URL change, tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useChatStore.getState();
      const userMsgs = state.messages.filter(m => m.role === "user").length;
      // Save if user has sent at least 1 message and story isn't done
      if (userMsgs > 0 && !state.storyDone) {
        state.saveDraft(); // Use persistent draft (30d) instead of auth save (24h)
        state.persistToStorage(); // Also save auth copy as backup
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── DEFENSE LAYER 2: Periodic auto-save every 30s ──
  // Mobile browsers don't reliably fire beforeunload (iOS kills process instantly).
  // This ensures at most 30s of progress is lost if the app is force-closed.
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useChatStore.getState();
      const userMsgs = state.messages.filter(m => m.role === "user").length;
      if (userMsgs > 0 && !state.storyDone) {
        state.saveDraft();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── DEFENSE LAYER 3: Save when app goes to background ──
  // visibilitychange fires reliably on mobile when switching apps or locking screen
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        const state = useChatStore.getState();
        const userMsgs = state.messages.filter(m => m.role === "user").length;
        if (userMsgs > 0 && !state.storyDone) {
          state.saveDraft();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // P3-FIX(IL-4): Show guest signup modal after 1.5s delay (let user read last AI response)
  useEffect(() => {
    if (freeLimitReached && !storyDone && !isLoading && !turnFiveReady) {
      const timer = setTimeout(() => setGuestModalReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [freeLimitReached, storyDone, isLoading, turnFiveReady]);

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
      className="fixed inset-0 z-[30] flex flex-col font-sans transition-colors duration-700"
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

      {/* Free trial turn counter — show remaining free messages */}
      {freeTrialMode && !freeLimitReached && !storyDone && userMsgCount > 0 && (
        <div className="absolute top-[70px] right-3 z-[60]">
          <div
            className="px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all duration-300"
            style={{
              background: userMsgCount >= FREE_TURN_LIMIT - 1
                ? "rgba(224,122,95,0.25)"
                : userMsgCount >= 2
                  ? "rgba(224,122,95,0.12)"
                  : "rgba(0,0,0,0.04)",
              color: userMsgCount >= 2 ? "#E07A5F" : "#999",
              border: userMsgCount >= FREE_TURN_LIMIT - 1 ? "1.5px solid rgba(224,122,95,0.4)" : "1px solid transparent",
              animation: userMsgCount >= FREE_TURN_LIMIT - 1 ? "pulse 2s ease-in-out infinite" : "none",
            }}
          >
            대화 {userMsgCount}/{FREE_TURN_LIMIT}회
            {userMsgCount === FREE_TURN_LIMIT - 1 && " · 마지막 대화예요!"}
          </div>
        </div>
      )}

      {/* Phase rule hint — hide when story is done (HIGH-4 fix) */}
      {!storyDone && !freeLimitReached && <PhaseRuleHint phase={currentPhase} />}

      {/* Turn-3 conversion popup — shown after 1.5s delay when free trial limit reached */}
      {turnFiveReady && freeLimitReached && !storyDone && (
        <TurnFivePopup
          isLoggedIn={!!user}
          ticketsRemaining={ticketsRemaining}
          onPersistChat={persistToStorage}
          onGoHome={onGoHome}
          onTicketUsed={onTicketUsed}
        />
      )}

      {/* "다음" button — shown after story is done, before celebration */}
      {storyDone && completedScenes.length > 0 && !showCelebration && (
        <div className="z-[60] bg-white/90 backdrop-blur-xl border-t border-black/[0.04]">
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
          onViewStory={() => {
            // For non-premium stories, show upgrade CTA before navigating
            if (!isPremiumStory && user) {
              setShowPremiumUpgrade(true);
            } else {
              onComplete();
            }
          }}
          onNewStory={onGoHome}
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
            style={{ background: "rgb(var(--surface) / 0.95)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", backdropFilter: "blur(8px)" }}
          >
            <p className="text-sm text-brown font-medium mb-2">
              {storySaveError === "login_required" ? "동화 저장을 위해 로그인이 필요해요" :
               storySaveError === "no_tickets" ? "티켓이 부족하여 저장할 수 없어요" :
               "동화 저장에 실패했어요"}
            </p>
            <button
              onClick={() => retrySaveStory()}
              className="px-5 py-2 rounded-full text-xs font-medium text-white transition-all active:scale-[0.97] min-h-[44px]"
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
          style={{ background: "rgb(var(--cream) / 0.88)", backdropFilter: "blur(14px)" }}
        >
          <div className="w-full max-w-sm text-center">
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
        <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[60] flex justify-center pb-2">
          <button
            onClick={() => {
              // ROUND1-FIX: Remove error messages AND the last user message, then re-send.
              // sendMessage() adds a new user message internally, so we must remove the original
              // to prevent duplicate user bubbles in the chat.
              const lastUserMsg = [...messages].reverse().find(m => m.role === "user" && !m.isError);
              if (lastUserMsg) {
                const withoutErrors = messages.filter(m => !m.isError);
                const withoutLastUser = withoutErrors.filter(m => m.id !== lastUserMsg.id);
                useChatStore.setState({ messages: withoutLastUser });
                sendMessage(lastUserMsg.content);
              }
            }}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
            }}
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* Input bar — hidden when story is done */}
      {!storyDone && (
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          phase={currentPhase}
          disabled={freeLimitReached}
        />
      )}

      {/* Save draft toast */}
      {showSaveToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-2 duration-300" role="status" aria-live="polite">
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
          tabIndex={-1}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHomeConfirm(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowHomeConfirm(false); }}
          ref={(el) => el?.focus()}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-6 text-center"
            style={{ background: "linear-gradient(180deg, rgb(var(--cream)), rgb(var(--surface)))", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
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
              className="w-full py-2.5 text-xs font-light text-brown-pale min-h-[44px]"
            >
              저장 없이 나가기
            </button>
            <button
              onClick={() => setShowHomeConfirm(false)}
              className="w-full py-2 text-xs font-light text-brown-pale mt-1 min-h-[44px]"
            >
              계속 대화하기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
