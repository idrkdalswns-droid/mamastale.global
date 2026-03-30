"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useChatStore, abortCurrentRequest } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTickets, invalidateTicketCache } from "@/lib/hooks/useTickets";

import { trackScreenView } from "@/lib/utils/analytics";
import { authFetchOnce } from "@/lib/utils/auth-fetch";
import toast from "react-hot-toast";
import { LandingSection } from "@/components/landing/LandingSection";
import { SERVICES, type ServiceId } from "@/lib/constants/services";
// TicketConfirmModal removed — ticket deduction now happens inline during chat (C-1 + SV-3)

// R1-PERF: Dynamic imports — reduce landing page First Load JS by ~80-100 kB
const OnboardingSlides = dynamic(() => import("@/components/onboarding/OnboardingSlides").then(m => ({ default: m.OnboardingSlides })), { ssr: false });
const ChatPage = dynamic(() => import("@/components/chat/ChatContainer").then(m => ({ default: m.ChatPage })), { ssr: false });
const StoryViewer = dynamic(() => import("@/components/story/StoryViewer").then(m => ({ default: m.StoryViewer })), { ssr: false });
const StoryEditor = dynamic(() => import("@/components/story/StoryEditor").then(m => ({ default: m.StoryEditor })), { ssr: false });
const CoverPicker = dynamic(() => import("@/components/story/CoverPicker").then(m => ({ default: m.CoverPicker })), { ssr: false });
const FeedbackWizard = dynamic(() => import("@/components/feedback/FeedbackWizard").then(m => ({ default: m.FeedbackWizard })), { ssr: false });
const CommunityPage = dynamic(() => import("@/components/feedback/CommunityPage").then(m => ({ default: m.CommunityPage })), { ssr: false });

type ScreenState = "landing" | "onboarding" | "chat" | "edit" | "coverPick" | "previewNotice" | "story" | "feedback" | "community";

// P0-4: 허용 전이 맵 — 비정상 전이(chat→story 직접 등) 차단
const ALLOWED_TRANSITIONS: Record<ScreenState, ScreenState[]> = {
  landing: ["onboarding", "chat"], // chat: 드래프트 복원
  onboarding: ["chat", "landing"],
  chat: ["edit", "landing"],
  edit: ["coverPick", "landing"],
  coverPick: ["previewNotice", "story"],
  previewNotice: ["story"],
  story: ["feedback", "landing"],
  feedback: ["community", "landing"],
  community: ["landing"],
};

// Route-Hunt 2-1: popstate 데이터 가드 — 뒤로/앞으로 시 데이터 없는 화면 진입 방지
// 치료 맥락에서 빈 화면 = 재외상 위험이므로 CRITICAL
const SCREEN_DATA_GUARDS: Partial<Record<ScreenState, () => boolean>> = {
  chat: () => useChatStore.getState().messages.length > 1,
  edit: () => useChatStore.getState().completedScenes.length > 0,
  coverPick: () => useChatStore.getState().completedScenes.length > 0,
  previewNotice: () => useChatStore.getState().completedScenes.length > 0,
  story: () => useChatStore.getState().completedScenes.length > 0,
  feedback: () => !!useChatStore.getState().sessionId,
};

export default function Home() {
  const [screen, setScreenRaw] = useState<ScreenState>("landing");
  const screenRef = useRef<ScreenState>("landing");
  const isPopstateRef = useRef(false);

  // P0-4: 전이 가드 래퍼 — popstate(뒤로가기)는 항상 허용
  const setScreen = useCallback((next: ScreenState) => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      screenRef.current = next;
      setScreenRaw(next);
      return;
    }
    const current = screenRef.current;
    if (current !== next && !ALLOWED_TRANSITIONS[current]?.includes(next)) {
      console.warn(`[Nav] 차단된 전이: ${current} → ${next}`);
      return;
    }
    screenRef.current = next;
    setScreenRaw(next);
  }, []);
  const [show, setShow] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [startPending, setStartPending] = useState(false);
  // Bug Bounty Fix 3-1: Initialize in useEffect to prevent SSR hydration mismatch
  const [ticketUsedForSession, setTicketUsedForSession] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("mamastale_ticket_session") === "1") setTicketUsedForSession(true);
    } catch { /* sessionStorage unavailable */ }
  }, []);
  const [draftInfo, setDraftInfo] = useState<{ phase: number; messageCount: number; savedAt: number; source: string } | null>(null);
  // H5-FIX: Tick counter to refresh relative time display ("3분 전" → "4분 전")
  const [, setDraftTick] = useState(0);
  useEffect(() => {
    if (!draftInfo) return;
    const id = setInterval(() => setDraftTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, [draftInfo]);
  // H9-FIX + UX-4: Update document.title per screen (with phase info for chat)
  const chatPhase = useChatStore((s) => s.currentPhase);
  useEffect(() => {
    const titles: Record<ScreenState, string> = {
      landing: "mamastale — 엄마의 이야기가 아이의 동화가 되다",
      onboarding: "시작하기 — mamastale",
      chat: `대화 중 (${chatPhase}단계) — mamastale`,
      edit: "동화 편집 — mamastale",
      coverPick: "표지 선택 — mamastale",
      previewNotice: "미리보기 — mamastale",
      story: "내 동화 — mamastale",
      feedback: "피드백 — mamastale",
      community: "커뮤니티 — mamastale",
    };
    document.title = titles[screen];
  }, [screen, chatPhase]);
  // Disable pull-to-refresh during chat/onboarding to prevent conversation loss
  useEffect(() => {
    if (["chat", "onboarding", "story", "edit", "coverPick"].includes(screen)) {
      document.body.classList.add("no-pull-refresh");
    } else {
      document.body.classList.remove("no-pull-refresh");
    }
    return () => document.body.classList.remove("no-pull-refresh");
  }, [screen]);
  const [editSaveError, setEditSaveError] = useState(false);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [myStoryCount, setMyStoryCount] = useState<number | null>(null);
  const [communityCount, setCommunityCount] = useState<number | null>(null);
  const mainCtaRef = useRef<HTMLDivElement>(null);
  const { completedScenes, completedStoryId, sessionId: chatSessionId, reset, restoreFromStorage, restoreDraft, updateScenes, retrySaveStory, storySaved, getDraftInfo, clearDraft, clearStorage, isPremiumStory } = useChatStore();
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // GA: Track screen view on every screen change
  useEffect(() => { trackScreenView(screen); }, [screen]);

  // Detect URL params: payment success, action=start, post-payment auto-start
  const [actionStart, setActionStart] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
    }
    if (params.get("action") === "start") {
      window.history.replaceState({}, "", "/");
      setActionStart(true);
    }
    // Post-payment auto-start: sessionStorage flag set by payment/success page
    try {
      const postPayment = sessionStorage.getItem("mamastale_post_payment");
      if (postPayment === "start") {
        sessionStorage.removeItem("mamastale_post_payment");
        setShowPaymentSuccess(true);
        setActionStart(true);
      }
    } catch { /* sessionStorage not available */ }
    // Save referral code for claiming after login
    const refCode = params.get("ref");
    if (refCode) {
      try {
        sessionStorage.setItem("mamastale_ref_code", refCode);
        toast("추천 링크로 오셨네요! 가입하면 무료 티켓을 드려요 🎁", { duration: 4000 });
      } catch {}
    }
    // Clean URL
    if (params.get("payment") || refCode) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // ── UNIFIED auto-restore: handles both action=start and auth redirect ──
  // Waits for auth to finish to avoid race condition with user state
  useEffect(() => {
    if (authLoading || screen !== "landing") return;

    // Path 0: Post-login redirect (e.g. pricing → login → home → redirect back to pricing)
    // Bug Bounty Fix 2-5: Validate redirect against whitelist to prevent open redirect
    if (user) {
      try {
        const postLoginRedirect = sessionStorage.getItem("mamastale_post_login_redirect");
        if (postLoginRedirect) {
          sessionStorage.removeItem("mamastale_post_login_redirect");
          try {
            const ALLOWED_REDIRECT_PREFIXES = ["/pricing", "/library", "/settings", "/community", "/teacher", "/diy", "/dalkkak", "/vending"];
            const normalized = new URL(postLoginRedirect, window.location.origin);
            if (normalized.origin === window.location.origin
                && ALLOWED_REDIRECT_PREFIXES.some(p => normalized.pathname.startsWith(p))) {
              window.location.href = postLoginRedirect;
              return;
            }
          } catch { /* malformed URL — skip redirect */ }
        }
      } catch { /* sessionStorage not available */ }
    }

    // Path A: ?action=start — explicit restore request (from auth callback / library)
    if (actionStart) {
      // Try draft first, then auth save — both work with or without user
      const restored = restoreDraft() || restoreFromStorage();
      setActionStart(false);
      if (restored) {
        setScreen("chat");
        setTimeout(() => {
          const s = useChatStore.getState();
          if (s.completedScenes.length > 0 && !s.storySaved) {
            retrySaveStory().catch(e => console.error("[retrySaveStory] auto-retry failed:", e));
          }
        }, 1000);
        return;
      }
      // No saved chat — treat as new story start (ticket-aware flow)
      setStartPending(true);
      return;
    }

    // Path B: Auto-detect saved chat state (no URL param needed)
    const info = getDraftInfo();
    if (!info) { setDraftInfo(null); return; }

    if (info.source === "auth" && user) {
      // Auto-restore for login/signup redirect flow (destructive — consumed)
      const restored = restoreFromStorage();
      if (restored) {
        setScreen("chat");
        setTimeout(() => {
          const s = useChatStore.getState();
          if (s.completedScenes.length > 0 && !s.storySaved) {
            retrySaveStory().catch(e => console.error("[retrySaveStory] auto-retry failed:", e));
          }
        }, 1000);
      }
    } else if (info.source === "auth" && !user) {
      // Auth save exists but user isn't logged in yet — show "이어하기" card
      // This handles the case where user refreshes before completing auth
      setDraftInfo(info);
    } else if (info.source === "draft") {
      // Persistent draft — show "이어하기" card (don't auto-restore)
      setDraftInfo(info);
    }
  }, [authLoading, user, actionStart, restoreFromStorage, restoreDraft, screen, retrySaveStory, getDraftInfo]);

  // Fetch ticket balance for logged-in users (via useTickets singleton cache)
  const { ticketData, loading: ticketsLoading, refetch: refetchTickets } = useTickets();

  // Sync hook data → local state (null when no user or loading)
  useEffect(() => {
    if (!user) {
      setTicketsRemaining(null);
      setMyStoryCount(null);
      return;
    }
    if (!ticketsLoading) {
      setTicketsRemaining(ticketData.remaining);
      setMyStoryCount(ticketData.storyCount);
    }
  }, [user, ticketData, ticketsLoading]);

  // Re-fetch when returning to landing or after payment
  useEffect(() => {
    if (user && screen === "landing") {
      refetchTickets();
    }
  }, [user, showPaymentSuccess, screen, refetchTickets]);

  // Handle deferred /?action=start after auth loaded
  // C-1+SV-3: Everyone starts with 3 free turns — no upfront ticket check
  useEffect(() => {
    if (!startPending || authLoading) return;
    setStartPending(false);
    setScreen("onboarding");
  }, [startPending, authLoading]);

  // Sticky CTA: show when main CTA button scrolls out of viewport
  useEffect(() => {
    if (screen !== "landing" || !mainCtaRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(mainCtaRef.current);
    return () => observer.disconnect();
  }, [screen]);

  // Social proof: fetch total story count for landing
  // H9-FIX: AbortController for cleanup on unmount/screen change
  useEffect(() => {
    if (screen !== "landing") return;
    const controller = new AbortController();
    fetch("/api/community?limit=0", { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total != null) setCommunityCount(d.total); })
      .catch(() => {});
    return () => controller.abort();
  }, [screen]);

  // C-1+SV-3: Auto-ticket effect REMOVED — ticket deduction now happens inline
  // during chat via TurnFivePopup's onTicketUsed callback

  // Clear ticket session flag (called when explicitly going home or starting fresh)
  const clearTicketSession = useCallback(() => {
    setTicketUsedForSession(false);
    try { sessionStorage.removeItem("mamastale_ticket_session"); } catch {}
  }, []);

  // C-1+SV-3: Everyone starts with 3 free turns, no upfront ticket deduction
  const handleStartStory = () => {
    clearTicketSession();
    setSelectedCover(null);
    setEditedTitle("");
    setFeedbackDone(false);
    setEditSaveError(false);
    // Everyone goes straight to onboarding — ticket gate at turn 3 during chat
    setScreen("onboarding");
  };

  // 3대 서비스 CTA 분기 핸들러
  const onServiceClick = useCallback((serviceId: string) => {
    if (serviceId === "main") {
      handleStartStory();
    } else {
      const service = SERVICES[serviceId as ServiceId];
      if (service) {
        router.push(service.route);
      }
    }
  }, [handleStartStory, router]);

  const closePaymentModal = useCallback(() => {
    setShowPaymentSuccess(false);
  }, []);

  // R7-F5: Auto-dismiss editSaveError toast when story screen renders
  useEffect(() => {
    if (screen === "story" && editSaveError) {
      const timer = setTimeout(() => setEditSaveError(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [screen, editSaveError]);

  // R1-PERF: Extracted handlers to avoid recreating on every render
  const handleEditDone = useCallback(async (edited: import("@/lib/types/story").Scene[], title: string) => {
    updateScenes(edited);
    setEditedTitle(title);
    if (completedStoryId && completedStoryId.startsWith("story_") === false) {
      try {
        // C1 FIX: Use authFetchOnce for guaranteed auth (Bearer + cookie fallback)
        const res = await authFetchOnce(`/api/stories/${completedStoryId}`, {
          method: "PATCH",
          body: JSON.stringify({ title, scenes: edited }),
        });
        if (!res.ok) setEditSaveError(true);
      } catch {
        setEditSaveError(true);
      }
    }
    setScreen("coverPick");
  }, [completedStoryId, updateScenes]);

  const handleCoverSelect = useCallback(async (coverPath: string) => {
    setSelectedCover(coverPath);
    if (completedStoryId && !completedStoryId.startsWith("story_")) {
      try {
        // C1 FIX: Use authFetchOnce for guaranteed auth (Bearer + cookie fallback)
        // H8 FIX: Show toast on cover save failure
        const res = await authFetchOnce(`/api/stories/${completedStoryId}`, {
          method: "PATCH",
          body: JSON.stringify({ coverImage: coverPath }),
        });
        if (!res.ok) {
          toast.error("표지 저장에 실패했어요. 서재에서 다시 설정할 수 있어요.");
        }
      } catch {
        toast.error("표지 저장에 실패했어요. 서재에서 다시 설정할 수 있어요.");
      }
    }
    // Freemium v2: first story → show preview notice before viewer
    setScreen(myStoryCount !== null && myStoryCount === 0 && !ticketUsedForSession ? "previewNotice" : "story");
  }, [completedStoryId, myStoryCount, ticketUsedForSession]);

  const handleCoverSkip = useCallback(() => {
    setSelectedCover(null);
    // Freemium v2: first story → show preview notice before viewer
    setScreen(myStoryCount !== null && myStoryCount === 0 && !ticketUsedForSession ? "previewNotice" : "story");
  }, [myStoryCount, ticketUsedForSession]);

  // ─── Browser history integration (JP-Y12) ───
  // Bug Bounty Fix 2-10: Only pushState for key screens (chat, story, community).
  // Other screens use replaceState to avoid excessive back-button presses (was 8+, now 3 max).
  //
  // Route-Hunt 2-2: SPA History 전략 (의도적 설계)
  // pushState: chat, story, community — 핵심 화면만 히스토리 생성
  // replaceState: onboarding, edit, coverPick, previewNotice, feedback 등
  // 이유: 치료적 대화 중 뒤로가기 과다 사용은 사용자 혼란 유발.
  // 핵심 전환점만 히스토리에 남겨 뒤로가기 3회 이내로 제한.
  useEffect(() => {
    if (screen !== "landing") {
      const pushScreens: ScreenState[] = ["chat", "story", "community"];
      if (pushScreens.includes(screen)) {
        window.history.pushState({ screen }, "", "/");
      } else {
        window.history.replaceState({ screen }, "", "/");
      }
    }
  }, [screen]);

  // Bug Bounty Fix 2-11 + Route-Hunt 2-1: Validate screen data before restoring from popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      isPopstateRef.current = true; // P0-4: 뒤로가기는 전이 가드 비적용

      // Route-Hunt 9-1: Abort streaming if leaving chat screen (7pass 2-2: abort BEFORE screen transition)
      if (screenRef.current === "chat") {
        abortCurrentRequest();
      }

      const prev = e.state?.screen as ScreenState | undefined;
      if (prev) {
        // Route-Hunt 2-1: Check data guard for the target screen
        const guard = SCREEN_DATA_GUARDS[prev];
        if (guard && !guard()) {
          // Data missing for this screen → fall back to landing
          setShow(false);
          setScreen("landing");
        } else {
          setScreen(prev);
        }
      } else {
        // No prior state → go to landing
        setShow(false);
        setScreen("landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setScreen]);

  // Trigger landing fade-in (HIGH-2 fix: moved to useEffect)
  useEffect(() => {
    if (screen === "landing") {
      requestAnimationFrame(() => setShow(true));
    }
  }, [screen]);

  // Fix 1-11: Move focus to first heading on screen transition (accessibility)
  useEffect(() => {
    if (screen !== "landing") {
      requestAnimationFrame(() => {
        const el = document.querySelector("h1, h2, [role='main']") as HTMLElement;
        if (el) { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
      });
    }
  }, [screen]);

  if (screen === "onboarding") {
    return (
      <ErrorBoundary fullScreen>
        <OnboardingSlides onDone={() => setScreen("chat")} onGoHome={() => { setShow(false); setScreen("landing"); }} />
      </ErrorBoundary>
    );
  }

  // CRITICAL-2 fix: chat completes → editor (then story viewer)
  // FI-6: ErrorBoundary wraps ChatPage to catch rendering errors gracefully
  if (screen === "chat") {
    return (
      <ErrorBoundary>
        <ChatPage
          onComplete={() => setScreen("edit")}
          onGoHome={() => { clearTicketSession(); setShow(false); setScreen("landing"); }}
          freeTrialMode={!ticketUsedForSession && myStoryCount !== 0}
          ticketsRemaining={ticketsRemaining}
          onTicketUsed={() => {
            setTicketUsedForSession(true);
            try { sessionStorage.setItem("mamastale_ticket_session", "1"); } catch {}
            setTicketsRemaining((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
          }}
        />
      </ErrorBoundary>
    );
  }

  // Story editor: mom can customize title and scene text
  if (screen === "edit") {
    return (
      <ErrorBoundary fullScreen>
        <StoryEditor
          scenes={completedScenes}
          title="나의 마음 동화"
          onDone={handleEditDone}
        />
      </ErrorBoundary>
    );
  }

  // Cover image picker — immersive gallery between edit and story
  if (screen === "coverPick") {
    return (
      <ErrorBoundary fullScreen>
        <CoverPicker
          storyTitle={editedTitle || "나의 마음 동화"}
          authorName={user?.user_metadata?.name || undefined}
          onSelect={handleCoverSelect}
          onSkip={handleCoverSkip}
        />
      </ErrorBoundary>
    );
  }

  // Freemium v2: Preview notice card before first story viewing
  if (screen === "previewNotice") {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-6">
        <div className="w-full max-w-[340px] text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(196,149,106,0.1)" }}>
            <span className="text-2xl font-serif font-bold" style={{ color: "#C4956A" }}>M</span>
          </div>
          <h2 className="text-lg font-serif font-bold text-brown mb-2 break-keep">
            동화가 완성되었어요!
          </h2>
          <p className="text-[13px] text-brown-light font-light leading-relaxed mb-2 break-keep">
            지금 전체 동화를 미리 읽어볼 수 있어요.
          </p>
          <p className="text-[12px] text-brown-pale font-light leading-relaxed mb-6 break-keep">
            서재에 영구 보관하려면 잠금 해제가 필요해요.
          </p>
          <button
            onClick={() => setScreen("story")}
            className="w-full py-3.5 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            지금 읽어보기
          </button>
        </div>
      </div>
    );
  }

  // Story viewing screen (read-only) after editing
  // feedbackDone = false: first viewing → go to feedback
  // feedbackDone = true: re-viewing from community → go back to community
  // Freemium v2: first story (myStoryCount === 0 at start) → previewMode (1회 전체 열람, PDF/공유/편집 비활성)
  const isFirstStoryPreview = myStoryCount !== null && myStoryCount === 0 && !ticketUsedForSession;
  if (screen === "story") {
    return (
      <ErrorBoundary fullScreen>
        <StoryViewer
          scenes={completedScenes}
          title={editedTitle || "나의 마음 동화"}
          authorName={user?.user_metadata?.name || undefined}
          coverImage={selectedCover || undefined}
          onBack={() => setScreen(feedbackDone ? "community" : "feedback")}
          onBackLabel={feedbackDone ? "돌아가기" : "피드백 남기기 →"}
          isPremium={isPremiumStory}
          onNewStory={() => { reset(); clearDraft(); clearTicketSession(); setSelectedCover(null); setEditedTitle(""); setFeedbackDone(false); setShow(false); setScreen("landing"); }}
          ticketsRemaining={ticketsRemaining}
          previewMode={isFirstStoryPreview}
        />
        {/* SIM-FIX(S18): Edit save error toast */}
        {editSaveError && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-2 duration-300" role="alert" aria-live="assertive">
            <div className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg"
              style={{ background: "rgba(224,122,95,0.92)", backdropFilter: "blur(8px)" }}>
              수정 저장에 실패했어요. 서재에서 다시 수정해 주세요.
            </div>
          </div>
        )}
      </ErrorBoundary>
    );
  }

  if (screen === "feedback") {
    return (
      <ErrorBoundary fullScreen>
        <FeedbackWizard sessionId={chatSessionId} onRestart={() => { setFeedbackDone(true); setScreen("community"); }} />
      </ErrorBoundary>
    );
  }

  if (screen === "community") {
    return (
      <ErrorBoundary fullScreen>
        <CommunityPage
          onRestart={() => {
            reset(); // LOW-11 fix: reset chat store
            clearDraft(); // P1-FIX(H3): Clear draft on new story start
            clearTicketSession();
            setSelectedCover(null);
            setEditedTitle("");
            setFeedbackDone(false);
            setShow(false);
            setScreen("landing");
          }}
          onViewStory={() => setScreen("story")}
        />
      </ErrorBoundary>
    );
  }

  return (
    <LandingSection
      user={user}
      authLoading={authLoading}
      signOut={signOut}
      show={show}
      screen={screen}
      handleStartStory={handleStartStory}
      onServiceClick={onServiceClick}
      mainCtaRef={mainCtaRef}
      draftInfo={draftInfo}
      restoreDraft={restoreDraft}
      clearStorage={clearStorage}
      setDraftInfo={setDraftInfo}
      setScreen={setScreen}
      communityCount={communityCount}
      showStickyCta={showStickyCta}
      showPaymentSuccess={showPaymentSuccess}
      closePaymentModal={closePaymentModal}
    />
  );
}
