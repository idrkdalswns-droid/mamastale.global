"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NAV_ITEMS_PUBLIC, NAV_ITEMS_AUTH } from "@/lib/constants/nav";
import { trackScreenView } from "@/lib/utils/analytics";
import toast from "react-hot-toast";
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
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [storyCount, setStoryCount] = useState<number | null>(null);
  const mainCtaRef = useRef<HTMLButtonElement>(null);
  const { completedScenes, completedStoryId, sessionId: chatSessionId, reset, restoreFromStorage, restoreDraft, updateScenes, retrySaveStory, storySaved, getDraftInfo, clearDraft, clearStorage, isPremiumStory } = useChatStore();
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
  useEffect(() => {
    if (screen !== "landing") return;
    fetch("/api/community?limit=0")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total != null) setStoryCount(d.total); })
      .catch(() => {});
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
          onNewStory={() => { reset(); clearDraft(); clearTicketSession(); setSelectedCover(null); setEditedTitle(""); setFeedbackDone(false); setShow(false); setScreen("landing"); }}
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

      {/* Top navigation bar — matches GlobalNav items */}
      <nav
        className="sticky top-0 z-40 backdrop-blur-lg border-b border-brown-pale/10"
        style={{ background: "rgb(var(--cream) / 0.85)" }}
        aria-label="메인 내비게이션"
      >
        <div className="flex items-center justify-between h-12 px-4 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-serif text-base font-bold text-brown no-underline">
              mamastale
            </Link>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {(user ? NAV_ITEMS_AUTH : NAV_ITEMS_PUBLIC).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] whitespace-nowrap no-underline transition-colors min-h-[44px] justify-center px-1 sm:px-2 flex items-center text-brown-mid font-light"
              >
                {item.label}
              </Link>
            ))}
            {!authLoading && (user ? (
              <button
                onClick={signOut}
                className="text-[11px] whitespace-nowrap text-brown-pale font-light min-h-[44px] flex items-center"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="text-[11px] whitespace-nowrap text-white font-medium no-underline px-2 sm:px-2.5 py-1 rounded-full min-h-[44px] flex items-center"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                로그인
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content — centered, max-width for desktop */}
      <div
        className="flex-1 flex flex-col max-w-md mx-auto w-full px-8 pt-6 relative z-[1] transition-all duration-1000"
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
          <div className="mb-4" />

          {/* ⭐ CTA 1차 — Title 직후 (전환율 최적화) */}
          <button
            ref={mainCtaRef}
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
            ) : user ? "우리 아이 동화 만들기" : (process.env.NEXT_PUBLIC_CTA_TEXT || "무료로 체험하기")}
          </button>
          {!user && !authLoading && (
            <Link href="/pricing" className="text-[10px] text-brown-pale/70 font-light text-center mb-5 block no-underline hover:text-coral transition-colors">
              첫 체험 무료 · 동화 완성 ₩3,920 · 4일 프로그램 ₩14,900 →
            </Link>
          )}
          {user && <div className="mb-5" />}



          {/* ════════════════════════════════════════
              DIY THUMBNAILS — Free stories preview (M1)
              ════════════════════════════════════════ */}
          <div id="diy" className="mb-5">
            <p className="font-serif text-sm text-brown font-semibold text-center mb-1">
              무료 DIY 동화
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
          </div>

          {/* DIY 동화 만들기 CTA */}
          <Link
            href="/diy/guide"
            className="w-full py-3 rounded-full text-[13px] font-medium text-center no-underline transition-all active:scale-[0.97] min-h-[44px] flex items-center justify-center gap-2 mb-3"
            style={{
              background: "linear-gradient(135deg, rgba(127,191,176,0.15), rgba(127,191,176,0.08))",
              color: "#5A9E94",
              border: "1.5px solid rgba(127,191,176,0.25)",
            }}
          >
            무료 DIY 동화 만들기 →
          </Link>

          {/* ════════════════════════════════════════
              HOW IT WORKS — 3-step process (B2)
              ════════════════════════════════════════ */}
          <div id="how" className="mb-6">
            <p className="font-serif text-sm text-brown font-semibold text-center mb-3">
              이렇게 만들어져요
            </p>
            <div className="flex flex-col gap-3">
              {[
                { step: "1", icon: "/images/teacher/phase/phase-a.jpeg", title: "엄마의 이야기", desc: "AI 상담사와 15분 대화하며 마음속 이야기를 나눠요" },
                { step: "2", icon: "/images/teacher/phase/phase-c.jpeg", title: "동화로 변환", desc: "엄마의 감정이 아름다운 10장면 동화로 재탄생해요" },
                { step: "3", icon: "/images/teacher/phase/phase-d.jpeg", title: "세상에 하나뿐인 책", desc: "완성된 동화를 PDF로 저장하고 아이에게 읽어줘요" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(127,191,176,0.06)" }}>
                  <div className="w-6 h-6 rounded-lg overflow-hidden relative flex-shrink-0 mt-0.5">
                    <Image src={item.icon} alt={item.title} fill className="object-cover" sizes="24px" />
                  </div>
                  <div>
                    <p className="text-[12px] text-brown font-medium">{item.title}</p>
                    <p className="text-[11px] text-brown-pale font-light leading-relaxed break-keep">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
              SOCIAL PROOF — Story Counter
              ════════════════════════════════════════ */}
          {storyCount != null && storyCount > 10 && (
            <p className="text-center text-[12px] text-brown-pale font-light mb-4">
              지금까지 <span className="text-coral font-semibold">{storyCount.toLocaleString()}편</span>의 동화가 만들어졌어요
            </p>
          )}
          {storyCount != null && storyCount > 0 && storyCount <= 10 && (
            <p className="text-center text-[12px] text-brown-pale font-light mb-4">
              엄마들의 이야기가 시작되고 있어요
            </p>
          )}

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


        </div>

        {/* Bottom section */}
        <div>
          {/* M2: Founder story — brand trust */}
          <div className="mt-4 mb-4 px-4 py-4 rounded-2xl" style={{ background: "rgba(196,149,106,0.05)", border: "1px solid rgba(196,149,106,0.1)" }}>
            <p className="font-serif text-[13px] text-brown font-semibold mb-2">mamastale 대표 강민준의 이야기</p>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep">
              20대 시절, 자전거 한 대에 침낭을 싣고 3개월간 동유럽 10개국을 횡단했습니다. 그중 두 달은 인적조차 드문 낯선 노지에 작은 텐트를 치고 밤을 지새워야 했습니다. 별빛 한 점 스며들지 않는 캄캄한 텐트 안. 그 완벽한 단절 속에서 저는 인간 존재의 밑바닥에 도사린 극심한 외로움과 고독을 마주했습니다.
            </p>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep mt-2">
              그 순간 저는 태어나서 해 본 적 없는 행동을 하는데요. 그게 바로 글쓰기였습니다.
            </p>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep mt-2">
              누군가에게 보여주기 위한 훌륭한 문장이 아니었습니다. 그저 내 안의 두려움, 슬픔, 그리고 날것의 감정들을 토해냈습니다.
            </p>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep mt-2">
              그리고 기적이 일어났습니다.
            </p>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep mt-2">
              그 기적이 지금은 마마스테일로 표현되고 있습니다.
            </p>
            <p className="text-[10px] text-brown-pale font-light mt-3">— 강민준, mamastale 대표</p>
          </div>

          {/* Medical disclaimer */}
          <div className="mt-2">
            <p className="text-[10px] text-brown-pale leading-relaxed font-sans font-light text-center">
              본 서비스는 실제 의료 행위를 대체하지 않습니다
            </p>
          </div>
        </div>
      </div>

      {/* Sticky CTA — visible when main CTA scrolls out of view */}
      {screen === "landing" && showStickyCta && !user && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 backdrop-blur-md"
          style={{ background: "rgba(251,245,236,0.92)", borderTop: "1px solid rgba(196,168,130,0.15)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-[430px] mx-auto">
            <button
              onClick={handleStartStory}
              className="w-full py-3.5 rounded-full text-white text-[14px] font-medium transition-transform active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)", boxShadow: "0 4px 16px rgba(224,122,95,0.3)" }}
            >
              {process.env.NEXT_PUBLIC_CTA_TEXT || "무료로 체험하기"}
            </button>
          </div>
        </div>
      )}

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
