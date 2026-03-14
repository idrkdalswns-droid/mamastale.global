"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useChatStore } from "@/lib/hooks/useChat";
import { usePresence } from "@/lib/hooks/usePresence";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { trackScreenView } from "@/lib/utils/analytics";
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
    // Center the target card in the scroll container
    const scrollLeft = card.offsetLeft - el.offsetWidth / 2 + card.offsetWidth / 2;
    el.scrollTo({ left: scrollLeft, behavior: "instant" });
  }, [initialIndex]);
  return (
    <div className="relative">
      {/* L-1: Scroll hint gradients */}
      <div className="absolute left-0 top-0 bottom-2 w-6 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, rgb(var(--cream)), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-2 w-6 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, rgb(var(--cream)), transparent)" }} />
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 rounded-lg"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        tabIndex={0}
        role="region"
        aria-label="동화 장면 갤러리"
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
  const { total: liveTotal, creating: liveCreating, isLoaded: presenceLoaded } = usePresence("home");

  // GA: Track screen view on every screen change
  useEffect(() => { trackScreenView(screen); }, [screen]);

  // Detect URL params: payment success, action=start
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
    // Clean URL
    if (params.get("payment")) {
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
                  href="/community"
                  className="text-xs text-brown-mid font-medium no-underline hover:text-coral transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center px-2"
                >
                  커뮤니티
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
          {/* Welcome message for logged-in users */}
          {user && !authLoading && (
            <div className="mb-4 px-4 py-2.5 rounded-2xl" style={{ background: "rgba(224,122,95,0.06)", border: "1px solid rgba(224,122,95,0.12)" }}>
              <p className="text-sm text-brown font-light">
                <span className="font-medium">{user.user_metadata?.name || user.email?.split("@")[0] || "회원"}</span>님, 환영합니다
              </p>
            </div>
          )}

          <h1 className="font-serif text-[36px] font-bold text-brown tracking-tight leading-[1.15] mb-2">
            mamastale
          </h1>

          <p className="font-serif text-[15px] text-brown-light font-normal leading-relaxed mb-0.5">
            엄마의 삶이 아이의 동화가 되다
          </p>
          <p className="text-[12px] text-brown-pale font-light mb-3 break-keep">
            우리 아이를 위한 세상에 단 하나뿐인 동화를 만들어 보세요
          </p>
          {presenceLoaded && liveTotal > 0 ? (
            <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-full bg-coral/5 border border-coral/10 w-fit">
              <span className="w-2 h-2 rounded-full bg-coral animate-pulse flex-shrink-0" />
              <p className="text-[11px] text-brown font-medium">
                지금 <span className="text-coral font-bold">{liveCreating > 0 ? liveCreating : liveTotal}</span>명의 엄마가 동화를 만들고 있어요
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-brown-pale font-light mb-5">
              많은 엄마들이 마음 동화를 만들고 있어요
            </p>
          )}

          {/* ════════════════════════════════════════
              STORYBOOK GALLERY — Product showcase
              ════════════════════════════════════════ */}
          <div className="mb-5">
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

          {/* Value hint — shown ABOVE CTA for non-logged-in users */}
          {!user && !authLoading && (
            <p className="text-[11px] text-brown-pale font-normal text-center mb-2 leading-relaxed">
              회원가입 없이 바로 시작할 수 있어요
            </p>
          )}

          {/* CTA button */}
          <button
            onClick={handleStartStory}
            disabled={authLoading}
            aria-busy={authLoading}
            className="w-full py-4 rounded-full text-white text-base font-sans font-medium cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 mb-3"
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

          {/* Ticket balance display for logged-in users */}
          {user && ticketsRemaining !== null && (
            <div className="flex items-center justify-center gap-2 mb-3 px-4 py-2 rounded-2xl bg-white/50 border border-brown-pale/10">
              <span className="text-xs text-brown font-medium">
                {ticketsRemaining > 0
                  ? <>남은 티켓: <span className="text-coral font-bold">{ticketsRemaining}장</span></>
                  : <span className="text-brown-light">새 동화를 만들려면 티켓이 필요해요</span>
                }
              </span>
              {ticketsRemaining <= 0 && (
                <Link
                  href="/pricing"
                  className="text-[10px] text-coral font-medium no-underline ml-2 px-2 py-1 rounded-full bg-coral/10 min-h-[44px] inline-flex items-center"
                >
                  구매하기
                </Link>
              )}
            </div>
          )}

          {/* 서비스 소개 */}
          <Link
            href="/about"
            className="w-full py-3 rounded-full text-[13px] font-medium text-center no-underline transition-all active:scale-[0.97] min-h-[44px] flex items-center justify-center gap-2 mb-3"
            style={{
              background: "linear-gradient(135deg, rgba(109,76,145,0.13), rgba(224,122,95,0.10))",
              color: "#6D4C91",
              border: "1.5px solid rgba(109,76,145,0.22)",
            }}
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

          {/* Navigation links */}
          <div className="flex gap-2 w-full mb-5">
            <Link
              href="/reviews"
              className="flex-1 py-2.5 rounded-xl text-[11px] font-medium text-center no-underline transition-all active:scale-[0.97] min-h-[44px] flex items-center justify-center"
              style={{
                background: "rgba(224,122,95,0.06)",
                color: "#E07A5F",
                border: "1px solid rgba(224,122,95,0.10)",
              }}
            >
              후기 보기
            </Link>
            <Link
              href="/pricing"
              className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold text-center no-underline transition-all active:scale-[0.97] min-h-[44px] flex items-center justify-center"
              style={{
                background: "rgba(224,122,95,0.10)",
                color: "#E07A5F",
                border: "1.5px solid rgba(224,122,95,0.20)",
              }}
            >
              요금 안내
            </Link>
          </div>
        </div>

        {/* Bottom section: testimonials */}
        <div>
          {/* Social proof — testimonials as horizontal scroll */}
          <div className="mt-6">
            <p className="text-[11px] text-brown-pale font-medium text-center mb-3">
              <span style={{ color: "#E07A5F" }}>★</span> 4.8 / 5.0 · 이용자 후기 <span className="text-brown-pale/50">→ 밀어서 더 보기</span>
            </p>
            <div
              className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {[
                {
                  text: "15분 만에 울고 웃으며 동화까지 완성했어요. 남편이 \u2018이게 네 이야기야?\u2019라며 놀라더라고요.",
                  author: "현정맘 (35세, 아들 4세)",
                  stars: 5,
                },
                {
                  text: "사업하느라 늘 미안했는데, 완성된 동화에 제 이야기가 아이 눈높이 모험담으로 바뀌어 있더라고요.",
                  author: "윤서맘 (41세, 딸 7세)",
                  stars: 5,
                },
                {
                  text: "아동심리 전문가지만 정작 제 감정은 돌보지 못했어요. AI라서 오히려 솔직해질 수 있었습니다.",
                  author: "서아맘 (38세, 아들 5세)",
                  stars: 5,
                },
              ].map((review, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[75%] rounded-2xl px-4 py-3 snap-start"
                  style={{ background: "rgba(196,149,106,0.05)", border: "1px solid rgba(196,149,106,0.1)" }}
                >
                  <div className="text-[10px] mb-1" style={{ color: "#E07A5F" }} role="img" aria-label={`5점 만점에 ${review.stars}점`}>
                    {"★".repeat(review.stars)}
                  </div>
                  <p className="text-[12px] text-brown-light font-normal leading-6 break-keep italic">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <p className="text-[10px] text-brown-pale font-light mt-1.5">
                    — {review.author}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Medical disclaimer */}
          <div className="mt-6">
            <p className="text-[10px] text-brown-pale leading-relaxed font-sans font-light text-center">
              본 서비스는 실제 의료 행위를 대체하지 않습니다
            </p>
          </div>
        </div>
      </div>

      {/* C-1+SV-3: TicketConfirmModal & NoTicketsModal removed —
           ticket gate now happens at turn 3 inside chat (TurnFivePopup) */}

      {/* SG-1: Payment Success Modal — accessible dialog */}
      {showPaymentSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="결제 완료 안내"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === "Escape") closePaymentModal(); }}
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
              티켓 구매가 완료되었어요.
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
