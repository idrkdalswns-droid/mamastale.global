"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import SectionTabBar from "@/components/layout/SectionTabBar";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { trackScreenView } from "@/lib/utils/analytics";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { DIY_STORIES } from "@/lib/constants/diy-stories";
// TicketConfirmModal removed — ticket deduction now happens inline during chat (C-1 + SV-3)

// R1-PERF: Dynamic imports — reduce landing page First Load JS by ~80-100 kB
const OnboardingSlides = dynamic(() => import("@/components/onboarding/OnboardingSlides").then(m => ({ default: m.OnboardingSlides })), { ssr: false });
const ChatPage = dynamic(() => import("@/components/chat/ChatContainer").then(m => ({ default: m.ChatPage })), { ssr: false });
const StoryViewer = dynamic(() => import("@/components/story/StoryViewer").then(m => ({ default: m.StoryViewer })), { ssr: false });
const StoryEditor = dynamic(() => import("@/components/story/StoryEditor").then(m => ({ default: m.StoryEditor })), { ssr: false });
const CoverPicker = dynamic(() => import("@/components/story/CoverPicker").then(m => ({ default: m.CoverPicker })), { ssr: false });
const FeedbackWizard = dynamic(() => import("@/components/feedback/FeedbackWizard").then(m => ({ default: m.FeedbackWizard })), { ssr: false });
const CommunityPage = dynamic(() => import("@/components/feedback/CommunityPage").then(m => ({ default: m.CommunityPage })), { ssr: false });

type ScreenState = "landing" | "onboarding" | "chat" | "edit" | "coverPick" | "story" | "feedback" | "community";

/** Horizontal scroll container that auto-scrolls to a specific child index on mount */
function GalleryScroller({ initialIndex, children }: { initialIndex: number; children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.children;
    if (cards.length <= initialIndex) return;
    const card = cards[initialIndex] as HTMLElement;
    const scrollLeft = card.offsetLeft - el.offsetWidth / 2 + card.offsetWidth / 2;
    el.scrollTo({ left: scrollLeft, behavior: "instant" });
  }, [initialIndex]);

  // SA4: Keyboard navigation for carousel accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 190; // card width + gap
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      el.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-2 w-6 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, rgb(var(--cream)), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-2 w-6 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, rgb(var(--cream)), transparent)" }} />
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 rounded-lg"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="동화 장면 갤러리 — 좌우 화살표 키로 탐색"
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [show, setShow] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [ticketUsedForSession, setTicketUsedForSession] = useState(() => {
    try { return sessionStorage.getItem("mamastale_ticket_session") === "1"; } catch { return false; }
  });
  const [draftInfo, setDraftInfo] = useState<{ phase: number; messageCount: number; savedAt: number; source: string } | null>(null);
  const [editSaveError, setEditSaveError] = useState(false);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const { completedScenes, completedStoryId, sessionId: chatSessionId, reset, restoreFromStorage, restoreDraft, updateScenes, retrySaveStory, storySaved, getDraftInfo, clearStorage, isPremiumStory } = useChatStore();
  const { user, loading: authLoading, signOut } = useAuth();

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
      try { sessionStorage.setItem("mamastale_ref_code", refCode); } catch {}
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
    if (user) {
      try {
        const postLoginRedirect = sessionStorage.getItem("mamastale_post_login_redirect");
        if (postLoginRedirect) {
          sessionStorage.removeItem("mamastale_post_login_redirect");
          window.location.href = postLoginRedirect;
          return;
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
            retrySaveStory();
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
            retrySaveStory();
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

  // Fetch ticket balance for logged-in users
  // Re-fetches when returning to landing (e.g. after completing a story)
  // CTO-FIX(HIGH): Add Bearer token + credentials for WebView/mobile compatibility
  useEffect(() => {
    if (!user || screen !== "landing") {
      if (!user) setTicketsRemaining(null);
      return;
    }
    (async () => {
      try {
        const headers: Record<string, string> = {};
        const supabase = createClient();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        const res = await fetch("/api/tickets", { headers, credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data) setTicketsRemaining(data.remaining ?? 0);
        }
      } catch {
        setTicketsRemaining(0);
        console.warn("[Tickets] 티켓 정보 로드 실패 — 기본값 0으로 설정");
      }
    })();
  }, [user, showPaymentSuccess, screen]); // re-fetch after payment or returning to landing

  // Handle deferred /?action=start after auth loaded
  // C-1+SV-3: Everyone starts with 3 free turns — no upfront ticket check
  useEffect(() => {
    if (!startPending || authLoading) return;
    setStartPending(false);
    setScreen("onboarding");
  }, [startPending, authLoading]);

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
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const supabase = createClient();
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        } catch { /* ignore */ }
        const res = await fetch(`/api/stories/${completedStoryId}`, {
          method: "PATCH",
          headers,
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
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const supabase = createClient();
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        } catch { /* ignore */ }
        await fetch(`/api/stories/${completedStoryId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ coverImage: coverPath }),
        });
      } catch {
        console.warn("[CoverPicker] Failed to persist cover_image to DB");
      }
    }
    setScreen("story");
  }, [completedStoryId]);

  const handleCoverSkip = useCallback(() => {
    setSelectedCover(null);
    setScreen("story");
  }, []);

  // ─── Browser history integration (JP-Y12) ───
  // Push state on screen changes so back button navigates within the flow
  useEffect(() => {
    if (screen !== "landing") {
      window.history.pushState({ screen }, "", "/");
    }
  }, [screen]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const prev = e.state?.screen as ScreenState | undefined;
      if (prev) {
        setScreen(prev);
      } else {
        // No prior state → go to landing
        setShow(false);
        setScreen("landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Trigger landing fade-in (HIGH-2 fix: moved to useEffect)
  useEffect(() => {
    if (screen === "landing") {
      requestAnimationFrame(() => setShow(true));
    }
  }, [screen]);

  if (screen === "onboarding") {
    return <OnboardingSlides onDone={() => setScreen("chat")} onGoHome={() => { setShow(false); setScreen("landing"); }} />;
  }

  // CRITICAL-2 fix: chat completes → editor (then story viewer)
  // FI-6: ErrorBoundary wraps ChatPage to catch rendering errors gracefully
  if (screen === "chat") {
    return (
      <ErrorBoundary>
        <ChatPage
          onComplete={() => setScreen("edit")}
          onGoHome={() => { clearTicketSession(); setShow(false); setScreen("landing"); }}
          freeTrialMode={!ticketUsedForSession}
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

  // Story viewing screen (read-only) after editing
  // feedbackDone = false: first viewing → go to feedback
  // feedbackDone = true: re-viewing from community → go back to community
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
          onNewStory={() => { reset(); clearTicketSession(); setSelectedCover(null); setEditedTitle(""); setFeedbackDone(false); setShow(false); setScreen("landing"); }}
          ticketsRemaining={ticketsRemaining}
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
    <div className="min-h-dvh bg-cream flex flex-col relative overflow-x-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* Background hero image */}
      <Image
        src="/images/hero.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 430px) 100vw, 430px"
        className="object-cover object-top pointer-events-none"
        role="presentation"
        style={{ opacity: 0.30 }}
      />
      {/* Gradient overlay for readability — lighter at top to show image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgb(var(--cream) / 0.3) 0%, rgb(var(--cream) / 0.65) 30%, rgb(var(--cream) / 0.92) 55%, rgb(var(--cream)) 75%)",
        }}
      />

      <WatercolorBlob top={-80} right={-100} size={280} color="rgba(232,168,124,0.07)" />
      <WatercolorBlob bottom={100} left={-80} size={240} color="rgba(184,216,208,0.08)" />

      {/* Top navigation bar */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between px-6 pt-4 pb-2 relative z-[2]">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-serif text-sm font-bold text-brown tracking-wide no-underline">
            mamastale
          </Link>
          <ThemeToggle />
        </div>
        {!authLoading && (
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Link
                  href="/library"
                  className="text-xs text-brown-mid font-medium no-underline hover:text-coral transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center px-2"
                >
                  내 서재
                </Link>
                <Link
                  href="/about"
                  className="text-xs text-brown-mid font-medium no-underline hover:text-coral transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center px-2"
                >
                  소개
                </Link>
                <button
                  onClick={signOut}
                  className="text-xs text-brown-pale font-light min-h-[44px] flex items-center px-2"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs text-brown-mid font-medium no-underline min-h-[44px] flex items-center px-2"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="text-xs text-white font-medium no-underline px-3 py-1.5 rounded-full min-h-[44px] flex items-center"
                  style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Section tab bar — sticky quick-jump navigation */}
      <SectionTabBar
        sections={[
          { id: "gallery", label: "동화" },
          { id: "how", label: "방법" },
          { id: "reviews", label: "후기" },
          { id: "start", label: "시작" },
          { id: "diy", label: "DIY" },
        ]}
        stickyTop="top-0"
        scrollOffset={34}
      />

      {/* Main content — centered, max-width for desktop */}
      <div
        className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-8 relative z-[1] transition-all duration-1000"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "none" : "translateY(24px)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Top section: title + description */}
        <div>
          <h1 className="font-serif text-[36px] font-bold text-brown tracking-tight leading-[1.15] mb-2">
            mamastale
          </h1>

          <p className="font-serif text-[15px] text-brown-light font-normal leading-relaxed mb-0.5">
            엄마의 삶이 아이의 동화가 되다
          </p>
          <p className="text-[12px] text-brown-pale font-light mb-1 break-keep">
            우리 아이를 위한 세상에 단 하나뿐인 동화를 만들어 보세요
          </p>
          <p className="text-[11px] text-brown-pale/70 font-light mb-4 break-keep">
            AI 대화로 엄마의 이야기가 10장면 동화로 완성돼요
          </p>

          {/* ⭐ CTA 1차 — Title 직후 (전환율 최적화) */}
          <button
            onClick={handleStartStory}
            disabled={authLoading}
            aria-busy={authLoading}
            className="w-full py-4 rounded-full text-white text-base font-sans font-medium cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 mb-2"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 8px 28px rgba(224,122,95,0.3)",
            }}
          >
            {authLoading ? (
              <span className="inline-flex items-center gap-2" aria-label="요청 처리 중입니다">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                불러오는 중...
              </span>
            ) : user ? "새 동화 만들기" : "15분이면 완성! 지금 시작하기"}
          </button>
          {!user && !authLoading && (
            <p className="text-[10px] text-brown-pale/70 font-light text-center mb-5">
              첫 동화 ₩3,920 · 4일 프로그램 ₩14,900 (1권당 ₩3,725)
            </p>
          )}
          {user && <div className="mb-5" />}

          {/* ════════════════════════════════════════
              STORYBOOK GALLERY — Product showcase
              ════════════════════════════════════════ */}
          <div id="gallery" className="mb-5">
            <p className="font-serif text-sm text-brown font-semibold text-center mb-1">
              이런 동화가 완성돼요
            </p>
            <p className="text-[10px] text-brown-pale font-light text-center mb-1">
              실제 완성된 동화의 한 장면이에요
            </p>
            <p className="text-[9px] text-brown-pale/60 font-light text-center mb-3">
              ← 옆으로 넘겨보세요 →
            </p>
            <GalleryScroller initialIndex={7}>
              {[
                "옛날 옛적, 예쁜 아기를 낳은 엄마가 있었어요. 엄마는 매일매일 설거지를 했어요. 물소리가 졸졸졸, 그릇이 반짝반짝.",
                "그런데 설거지를 할 때마다 엄마 마음이 이상했어요. 뭔가 쓸쓸하고, 뭔가 그리워요. \"내가 언제 이렇게 엄마가 되었지?\"",
                "어느 날, 엄마가 설거지를 하고 있을 때였어요. 창가에 작은 새 한 마리가 날아왔어요. 아기 새였어요, 너무너무 작은.",
                "아기 새는 말이 없었어요. 그냥 조용히 앉아 있었어요. 엄마도 말이 없었어요. 둘이 함께 조용조용.",
                "매일매일 설거지 시간이 되면 아기 새가 왔어요. 엄마는 혼자가 아니었어요. \"안녕, 작은 새야.\"",
                "어느 날 엄마가 물어봤어요. \"너는 왜 여기 오는 거야?\" 아기 새가 대답했어요. \"엄마도 새로 태어났거든요.\"",
                "\"나도 새로 태어났다고?\" 엄마가 깜짝 놀랐어요. 아기 새가 말했어요. \"엄마가 되면서 새로운 마음이 생겼어요.\"",
                "그때부터 엄마는 알았어요. 설거지할 때 느끼는 그 마음이 새로운 자신이라는 걸. 쓸쓸하지만 소중한 마음.",
                "\"나라는 존재는 변하지 않았지만, 새로운 마음이 하나 더 생겼구나.\" 엄마가 웃으며 말했어요.",
                "작은 아기야, 엄마에게도 새로운 마음이 자라고 있어요. 그 마음이 바로 너를 사랑하는 마음이야. 쓸쓸해도 괜찮아, 그것도 사랑이니까.",
              ].map((text, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 snap-center rounded-xl overflow-hidden relative"
                  style={{
                    width: "180px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                  }}
                >
                  <Image
                    src={`/images/sample/scene-${String(i + 1).padStart(2, "0")}.jpg`}
                    alt={`동화 장면 ${i + 1}`}
                    width={180}
                    height={320}
                    className="w-full aspect-[9/16] object-cover object-top"
                    loading={i >= 6 && i <= 8 ? "eager" : "lazy"}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 px-3 pt-14 pb-3 flex flex-col justify-end"
                    style={{
                      background: "linear-gradient(to top, rgba(255,255,255,0.93) 0%, rgba(255,255,255,0.86) 50%, rgba(255,255,255,0) 100%)",
                    }}
                  >
                    <p
                      className="font-serif text-[10.5px] leading-[1.85] break-keep"
                      style={{ color: "#5A3E2B" }}
                    >
                      {text}
                    </p>
                    <p className="text-[8px] text-brown-pale font-light mt-1.5 text-right">
                      {i + 1} / 10
                    </p>
                  </div>
                </div>
              ))}
            </GalleryScroller>
          </div>

          {/* ════════════════════════════════════════
              HOW IT WORKS — 3-step process (B2)
              ════════════════════════════════════════ */}
          <div id="how" className="mb-6">
            <p className="font-serif text-sm text-brown font-semibold text-center mb-3">
              이렇게 만들어져요
            </p>
            <div className="flex flex-col gap-3">
              {[
                { step: "1", icon: "💬", title: "엄마의 이야기", desc: "AI 상담사와 15분 대화하며 마음속 이야기를 나눠요" },
                { step: "2", icon: "✨", title: "동화로 변환", desc: "엄마의 감정이 아름다운 10장면 동화로 재탄생해요" },
                { step: "3", icon: "📖", title: "세상에 하나뿐인 책", desc: "완성된 동화를 PDF로 저장하고 아이에게 읽어줘요" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(127,191,176,0.06)" }}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[12px] text-brown font-medium">{item.title}</p>
                    <p className="text-[11px] text-brown-pale font-light leading-relaxed break-keep">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
              SOCIAL PROOF — Reviews (N3)
              ════════════════════════════════════════ */}
          <div id="reviews" className="mb-5">
            <p className="font-serif text-sm text-brown font-semibold text-center mb-0.5">
              엄마들의 후기
            </p>
            <p className="text-[11px] text-center mb-3">
              <span className="text-coral font-medium">★ 4.8</span>
              <span className="text-brown-pale font-light"> · 17개의 리뷰</span>
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                { name: "민지맘", text: "아이한테 읽어줬더니 '엄마 이야기야?' 하면서 눈이 반짝반짝. 저도 모르게 울컥했어요.", stars: 5 },
                { name: "하율맘", text: "산후우울증이 심했는데, 제 감정이 동화가 되니까 한결 가벼워졌어요. 치유되는 느낌이에요.", stars: 5 },
                { name: "서윤맘", text: "15분 만에 완성되는 게 놀라워요. 세상에 하나뿐인 동화라 더 특별하고요.", stars: 4 },
              ].map((review, i) => (
                <div key={i} className="px-4 py-3 rounded-xl" style={{ background: "rgba(224,122,95,0.04)", border: "1px solid rgba(224,122,95,0.08)" }}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] text-coral">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
                  </div>
                  <p className="text-[11px] text-brown font-light leading-relaxed break-keep">&ldquo;{review.text}&rdquo;</p>
                  <p className="text-[10px] text-brown-pale font-light mt-1">— {review.name}</p>
                </div>
              ))}
            </div>
            <Link href="/reviews" className="text-[11px] text-coral font-light no-underline text-center block mt-2">
              후기 더보기 →
            </Link>
          </div>

          {/* ⭐ CTA 2차 — Reviews 직후 (사회적 증거로 설득된 사용자 캡처) */}
          <div id="start" className="mb-5">
            <button
              onClick={handleStartStory}
              disabled={authLoading}
              className="w-full py-3.5 rounded-full text-white text-[14px] font-sans font-medium cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.25)",
              }}
            >
              {user ? "새 동화 만들기" : "지금 시작하기"}
            </button>
          </div>

          {/* ════════════════════════════════════════
              DIY THUMBNAILS — Free stories preview (M1)
              ════════════════════════════════════════ */}
          <div id="diy" className="mb-5">
            <p className="font-serif text-sm text-brown font-semibold text-center mb-1">
              무료 DIY 동화
            </p>
            <p className="text-[11px] text-brown-pale font-light text-center mb-3">
              직접 이미지를 골라 나만의 동화를 만들어 보세요
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DIY_STORIES.slice(0, 3).map((story) => (
                <Link key={story.id} href={`/diy/${story.id}`} className="no-underline group">
                  <div className="rounded-lg overflow-hidden aspect-square relative">
                    <Image
                      src={story.thumbnail}
                      alt={story.title}
                      width={120}
                      height={120}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pt-6" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
                      <p className="text-[9px] text-white font-medium leading-tight">{story.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/diy" className="text-[11px] text-coral font-light no-underline text-center block mt-2">
              6개 동화 모두 보기 →
            </Link>
          </div>

          {/* DIY 동화 만들기 CTA */}
          <Link
            href="/diy"
            className="w-full py-3 rounded-full text-[13px] font-medium text-center no-underline transition-all active:scale-[0.97] min-h-[44px] flex items-center justify-center gap-2 mb-3"
            style={{
              background: "linear-gradient(135deg, rgba(127,191,176,0.15), rgba(127,191,176,0.08))",
              color: "#5A9E94",
              border: "1.5px solid rgba(127,191,176,0.25)",
            }}
          >
            무료 DIY 동화 만들기 →
          </Link>

          {/* 서비스 소개 */}
          <Link
            href="/about"
            className="text-[12px] text-brown-pale font-light no-underline underline-offset-2 hover:text-brown-light transition-colors text-center block mb-3"
          >
            서비스 소개 →
          </Link>

          {/* Draft resume card */}
          {draftInfo && (
            <div
              className="rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.15)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-brown">진행 중인 대화가 있어요</p>
                  <p className="text-[11px] text-brown-pale font-light">
                    {draftInfo.phase}단계 · {draftInfo.messageCount}개의 메시지
                    {draftInfo.savedAt > 0 && <> · {(() => {
                      const mins = Math.floor((Date.now() - draftInfo.savedAt) / 60000);
                      if (mins < 1) return "방금 전";
                      if (mins < 60) return `${mins}분 전`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}시간 전`;
                      return `${Math.floor(hrs / 24)}일 전`;
                    })()}</>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Use non-destructive restoreDraft (draft stays in localStorage)
                    const restored = restoreDraft();
                    if (restored) {
                      setDraftInfo(null);
                      setScreen("chat");
                    }
                  }}
                  className="flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
                >
                  이어서 대화하기
                </button>
                <button
                  onClick={() => {
                    if (confirm("진행 중인 대화를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
                      clearStorage(); setDraftInfo(null);
                    }
                  }}
                  className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-light text-brown-pale transition-all"
                  style={{ border: "1px solid rgba(196,149,106,0.2)" }}
                  aria-label="저장된 대화 삭제"
                >
                  삭제
                </button>
              </div>
            </div>
          )}

          {/* S2: Referral UI — show for logged-in users */}
          {user && !authLoading && (
            <div className="mb-4">
              <ReferralCard />
            </div>
          )}

        </div>

        {/* Bottom section */}
        <div>
          {/* M2: Founder story — brand trust */}
          <div className="mt-4 mb-4 px-4 py-4 rounded-2xl" style={{ background: "rgba(196,149,106,0.05)", border: "1px solid rgba(196,149,106,0.1)" }}>
            <p className="font-serif text-[13px] text-brown font-semibold mb-2">만든 사람의 이야기</p>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep">
              &ldquo;아내의 산후우울증을 겪으며, 엄마들의 아픔이 아이를 위한 사랑의 이야기로 바뀔 수 있다면 얼마나 좋을까 생각했습니다.&rdquo;
            </p>
            <p className="text-[10px] text-brown-pale font-light mt-2">— 강민준, mamastale 대표</p>
          </div>

          {/* Medical disclaimer */}
          <div className="mt-2">
            <p className="text-[10px] text-brown-pale leading-relaxed font-sans font-light text-center">
              본 서비스는 실제 의료 행위를 대체하지 않습니다
            </p>
          </div>
        </div>
      </div>

      {/* C-1+SV-3: TicketConfirmModal & NoTicketsModal removed —
           ticket gate now happens at turn 3 inside chat (TurnFivePopup) */}

      {/* SG-1: Payment Success Modal — accessible dialog with focus trap (AP5) */}
      {showPaymentSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="결제 완료 안내"
          tabIndex={-1}
          ref={(el) => { if (el) el.focus(); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { closePaymentModal(); return; }
            // AP5: Focus trap — keep Tab within modal
            if (e.key === "Tab") {
              const focusable = e.currentTarget.querySelectorAll<HTMLElement>("button, a, [tabindex]:not([tabindex='-1'])");
              if (focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
              }
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
              결제가 완료되었어요
            </h2>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-2 break-keep">
              구매가 완료되었어요.
            </p>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
              이제 아이를 위한 아름다운<br />
              <span className="text-coral font-medium">세상에 하나뿐인 마음 동화</span>를<br />
              만들어 볼까요?
            </p>
            <button
              onClick={() => {
                closePaymentModal();
                // CTO-FIX(CRITICAL): 결제 성공 후에도 반드시 TicketConfirmModal을 거쳐 티켓 차감
                // 이전: setScreen("onboarding") → 티켓 차감 없이 스토리 시작 (매출 손실)
                // 수정: handleStartStory() → TicketConfirmModal → /api/tickets/use → onboarding
                handleStartStory();
              }}
              className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-transform active:scale-[0.97] mb-3"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              지금 바로 동화 만들기
            </button>
            <button
              onClick={closePaymentModal}
              className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
            >
              나중에 할게요
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
