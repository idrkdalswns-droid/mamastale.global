"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { PHASES } from "@/lib/constants/phases";
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides";
import { ChatPage } from "@/components/chat/ChatContainer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { StoryViewer } from "@/components/story/StoryViewer";
import { StoryEditor } from "@/components/story/StoryEditor";
import { FeedbackWizard } from "@/components/feedback/FeedbackWizard";
import { CommunityPage } from "@/components/feedback/CommunityPage";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type ScreenState = "landing" | "onboarding" | "chat" | "edit" | "story" | "feedback" | "community";

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [show, setShow] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showNoTickets, setShowNoTickets] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ phase: number; messageCount: number; savedAt: number; source: string } | null>(null);
  const { completedScenes, completedStoryId, sessionId: chatSessionId, reset, restoreFromStorage, restoreDraft, updateScenes, retrySaveStory, storySaved, getDraftInfo, clearStorage } = useChatStore();
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Auto-restore chat after signup/login OR show "이어하기" card for drafts
  useEffect(() => {
    if (authLoading || screen !== "landing") return;

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
    } else if (info.source === "draft") {
      // Persistent draft — show "이어하기" card (don't auto-restore)
      setDraftInfo(info);
    }
  }, [authLoading, user, restoreFromStorage, screen, retrySaveStory, getDraftInfo]);

  // Detect URL params: payment success, referral code, action=start
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
    }
    // Direct start from library or other pages
    // Uses startPending to defer ticket check until auth/tickets are loaded
    if (params.get("action") === "start") {
      window.history.replaceState({}, "", "/");
      // Try persistent draft first — drafts bypass ticket check (already started)
      const restored = restoreDraft() || restoreFromStorage();
      if (restored) {
        setScreen("chat");
        return;
      }
      // New story: defer to ticket-aware flow
      setStartPending(true);
      return;
    }
    // Save referral code to localStorage + show welcome popup
    const ref = params.get("ref");
    if (ref) {
      try { localStorage.setItem("mamastale_ref", ref.trim().toUpperCase()); } catch {}
      setShowReferralWelcome(true);
    }
    // Clean URL
    if (params.get("payment") || ref) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Auto-apply referral code after login
  useEffect(() => {
    if (authLoading || !user || referralApplied) return;
    try {
      const savedRef = localStorage.getItem("mamastale_ref");
      if (!savedRef) return;
      localStorage.removeItem("mamastale_ref");
      setReferralApplied(true);
      fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: savedRef }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Re-fetch ticket balance to show updated count
            fetch("/api/tickets")
              .then((r) => r.ok ? r.json() : null)
              .then((d) => { if (d) setTicketsRemaining(d.remaining ?? 0); });
          }
        })
        .catch(() => {});
    } catch {}
  }, [authLoading, user, referralApplied]);

  // Fetch my referral code for logged-in users
  useEffect(() => {
    if (!user) { setReferralCode(null); return; }
    fetch("/api/referral")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.code) setReferralCode(data.code); })
      .catch(() => {});
  }, [user]);

  // Fetch ticket balance for logged-in users
  // Re-fetches when returning to landing (e.g. after completing a story)
  useEffect(() => {
    if (!user || screen !== "landing") {
      if (!user) setTicketsRemaining(null);
      return;
    }
    fetch("/api/tickets")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setTicketsRemaining(data.remaining ?? 0);
      })
      .catch(() => {});
  }, [user, showPaymentSuccess, screen]); // re-fetch after payment or returning to landing

  // Handle deferred /?action=start after auth + tickets are loaded
  useEffect(() => {
    if (!startPending || authLoading) return;
    // Guest users: allow (they have 5 free turns)
    if (!user) {
      setStartPending(false);
      setScreen("onboarding");
      return;
    }
    // Logged-in: wait for ticket balance
    if (ticketsRemaining === null) return; // still loading
    setStartPending(false);
    if (ticketsRemaining <= 0) {
      setShowNoTickets(true);
    } else {
      setScreen("onboarding");
    }
  }, [startPending, authLoading, user, ticketsRemaining]);

  // Handle "새 동화 만들기" click with ticket check
  const handleStartStory = () => {
    // Block clicks while ticket balance is still loading for logged-in users
    // (prevents bypassing ticket check by clicking before API responds)
    if (user && ticketsRemaining === null) return;
    if (user && ticketsRemaining !== null && ticketsRemaining <= 0) {
      setShowNoTickets(true);
      return;
    }
    setScreen("onboarding");
  };

  const closePaymentModal = useCallback(() => {
    setShowPaymentSuccess(false);
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
          onGoHome={() => { setShow(false); setScreen("landing"); }}
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
          onDone={(edited, title) => {
            updateScenes(edited);
            setEditedTitle(title);
            // Silently update saved story in DB if exists
            if (completedStoryId && completedStoryId.startsWith("story_") === false) {
              fetch(`/api/stories/${completedStoryId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, scenes: edited }),
              }).catch(() => {});
            }
            setScreen("story");
          }}
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
          onBack={() => setScreen(feedbackDone ? "community" : "feedback")}
          onBackLabel={feedbackDone ? "돌아가기" : "피드백 남기기 →"}
        />
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
        sizes="100vw"
        className="object-cover object-top pointer-events-none"
        style={{ opacity: 0.22 }}
      />
      {/* Gradient overlay for readability — lighter at top to show image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(253,249,244,0.3) 0%, rgba(253,249,244,0.65) 30%, rgba(253,249,244,0.92) 55%, rgba(253,249,244,1) 75%)",
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
            <div className="mb-4 px-4 py-2.5 rounded-2xl bg-mint/20 border border-mint/30">
              <p className="text-sm text-brown font-light">
                <span className="font-medium">{user.user_metadata?.name || user.email?.split("@")[0]}</span>님, 환영합니다
              </p>
            </div>
          )}

          <h1 className="font-serif text-[36px] font-bold text-brown tracking-tight leading-[1.15] mb-2">
            mamastale
          </h1>

          <p className="font-serif text-[15px] text-brown-light font-normal leading-relaxed mb-5">
            나의 이야기가 아이의 동화가 되다
          </p>

          {/* Description card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-[20px] p-5 border border-brown-pale/10 mb-4">
            <p className="text-[13px] text-brown-light leading-7 font-sans font-normal break-keep">
              <span className="text-coral font-semibold">&ldquo;엄마, 엄마 동화 들려줘!&rdquo;</span>
              <br />
              엄마의 삶이 아이를 위한{" "}
              <span className="text-coral font-medium">세상에 하나뿐인 동화</span>
              가 됩니다.
              <br />
              따뜻한 대화를 나누며 4단계 마음 여정을 체험하고,
              아이에게 들려줄 나만의 동화를 만들어 보세요.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/50 border border-brown-pale/10">
              <span className="text-[11px]">🧠</span>
              <span className="text-[10px] text-brown-mid font-medium">전문가 감수</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/50 border border-brown-pale/10">
              <span className="text-[11px]">📖</span>
              <span className="text-[10px] text-brown-mid font-medium">실제 엄마 이야기</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/50 border border-brown-pale/10">
              <span className="text-[11px]">🔒</span>
              <span className="text-[10px] text-brown-mid font-medium">100% 비공개</span>
            </div>
          </div>

          {/* Draft resume card */}
          {draftInfo && (
            <div
              className="rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.15)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📝</span>
                <div>
                  <p className="text-sm font-semibold text-brown">진행 중인 대화가 있어요</p>
                  <p className="text-[11px] text-brown-pale font-light">
                    {draftInfo.phase}단계 · {draftInfo.messageCount}개의 메시지
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
                  className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
                >
                  이어서 대화하기
                </button>
                <button
                  onClick={() => { clearStorage(); setDraftInfo(null); }}
                  className="px-4 py-2.5 rounded-full text-xs font-light text-brown-pale transition-all"
                  style={{ border: "1px solid rgba(196,149,106,0.2)" }}
                >
                  삭제
                </button>
              </div>
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={handleStartStory}
            disabled={!!user && ticketsRemaining === null && !authLoading}
            className="w-full py-4 rounded-full text-white text-base font-sans font-medium cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 mb-3"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 8px 28px rgba(224,122,95,0.3)",
            }}
          >
            {user && ticketsRemaining === null && !authLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                불러오는 중...
              </span>
            ) : user ? "새 동화 만들기" : "무료로 체험 시작하기"}
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
                  className="text-[10px] text-coral font-medium no-underline ml-2 px-2 py-1 rounded-full bg-coral/10"
                >
                  구매하기
                </Link>
              )}
            </div>
          )}

          {/* Referral link for logged-in users */}
          {user && referralCode && (
            <button
              onClick={() => {
                const url = `${window.location.origin}?ref=${referralCode}`;
                navigator.clipboard.writeText(url).then(() => {
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }).catch(() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "mamastale 추천",
                      text: "엄마의 이야기가 아이의 동화가 되는 곳, mamastale을 추천합니다!",
                      url,
                    });
                  }
                });
              }}
              className="w-full mb-3 py-2.5 rounded-full text-xs font-medium transition-all active:scale-[0.97]"
              style={{
                background: referralCopied
                  ? "rgba(127,191,176,0.15)"
                  : "rgba(224,122,95,0.08)",
                color: referralCopied ? "#5A9E8F" : "#E07A5F",
                border: referralCopied
                  ? "1.5px solid rgba(127,191,176,0.3)"
                  : "1.5px solid rgba(224,122,95,0.2)",
              }}
            >
              {referralCopied
                ? "추천 링크가 복사되었어요!"
                : "친구 추천하고 무료 티켓 받기"}
            </button>
          )}

          {/* Free trial + time hint for non-logged-in users */}
          {!user && !authLoading && (
            <p className="text-[11px] text-brown-pale font-normal text-center mb-4 leading-relaxed">
              회원가입 없이 5회 무료 대화 · 약 15분이면 충분해요
            </p>
          )}

          {/* Quick browse links */}
          <div className="flex gap-2 mb-4">
            <Link
              href="/reviews"
              className="flex-1 py-2 rounded-xl text-xs font-medium text-center no-underline transition-all active:scale-[0.97]"
              style={{
                background: "rgba(224,122,95,0.08)",
                color: "#E07A5F",
                border: "1px solid rgba(224,122,95,0.12)",
              }}
            >
              후기 보기
            </Link>
            <Link
              href="/community"
              className="flex-1 py-2 rounded-xl text-xs font-medium text-center no-underline transition-all active:scale-[0.97]"
              style={{
                background: "rgba(109,76,145,0.08)",
                color: "#6D4C91",
                border: "1px solid rgba(109,76,145,0.12)",
              }}
            >
              커뮤니티
            </Link>
            <Link
              href="/pricing"
              className="flex-1 py-2 rounded-xl text-xs font-medium text-center no-underline transition-all active:scale-[0.97]"
              style={{
                background: "rgba(196,149,106,0.08)",
                color: "#8B7355",
                border: "1px solid rgba(196,149,106,0.12)",
              }}
            >
              티켓 구매
            </Link>
          </div>

          {/* Phase pills — compact */}
          <div className="grid grid-cols-2 gap-1.5 mb-5">
            {Object.values(PHASES).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
                style={{
                  background: `${p.accent}0D`,
                  border: `1px solid ${p.accent}18`,
                }}
              >
                <span className="text-sm flex-shrink-0">{p.icon}</span>
                <div>
                  <div
                    className="text-[11px] font-semibold font-sans leading-tight"
                    style={{ color: p.text }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="text-[10px] font-sans font-normal"
                    style={{ color: p.text, opacity: 0.7 }}
                  >
                    {p.theory}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section: testimonials */}
        <div>
          {/* Social proof — testimonials as horizontal scroll */}
          <div className="mt-6">
            <p className="text-[11px] text-brown-pale font-medium text-center mb-3">
              ⭐ 4.8 / 5.0 · 이용자 후기
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
                  <div className="text-[10px] text-amber-400 mb-1">
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

          {/* Footer disclaimer */}
          <p className="text-[10px] text-brown-pale leading-relaxed font-sans font-light text-center mt-4">
            본 서비스는 실제 의료 행위를 대체하지 않습니다
          </p>
          <a
            href="/feature-requests"
            className="block text-[10px] text-brown-pale/70 font-sans font-light text-center mt-2 underline underline-offset-2"
          >
            개발 요청 보드
          </a>

          {/* Bottom breathing room */}
          <div className="h-20" />
        </div>
      </div>

      {/* SG-1: No Tickets Modal — accessible dialog */}
      {showNoTickets && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="티켓 부족 안내"
          onKeyDown={(e) => { if (e.key === "Escape") setShowNoTickets(false); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
              티켓이 필요해요
            </h2>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
              동화를 만들려면 티켓이 필요합니다.<br />
              티켓을 구매하고 나만의<br />
              <span className="text-coral font-medium">마음 동화</span>를 만들어 보세요.
            </p>
            <Link
              href="/pricing"
              onClick={() => setShowNoTickets(false)}
              className="block w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97] mb-3"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              티켓 구매하기
            </Link>
            <button
              onClick={() => setShowNoTickets(false)}
              className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* SG-1: Payment Success Modal — accessible dialog */}
      {showPaymentSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="결제 완료 안내"
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
              감사합니다, 어머니
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
                setScreen("onboarding");
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
      {/* SG-1: Referral Welcome Modal — accessible dialog */}
      {showReferralWelcome && !user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="친구 추천 안내"
          onKeyDown={(e) => { if (e.key === "Escape") setShowReferralWelcome(false); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2 className="font-serif text-xl font-bold text-brown mb-2 leading-tight">
              친구가 초대했어요!
            </h2>
            <p className="text-[13px] text-brown-light font-light leading-relaxed mb-4 break-keep">
              <span className="text-coral font-semibold">mamastale</span>은
              엄마의 이야기를 아이를 위한{" "}
              <span className="text-coral font-medium">세상에 하나뿐인 마음 동화</span>
              로 만들어주는 서비스예요.
            </p>
            <div
              className="rounded-2xl p-4 mb-5"
              style={{ background: "rgba(224,122,95,0.08)", border: "1.5px solid rgba(224,122,95,0.15)" }}
            >
              <p className="text-sm text-brown font-medium leading-relaxed break-keep">
                지금 회원가입하시면<br />
                <span className="text-coral font-bold text-base">무료 티켓 1장</span>을 드려요!
              </p>
              <p className="text-[11px] text-brown-pale font-light mt-1">
                추천인에게도 티켓 1장이 지급됩니다
              </p>
            </div>

            <button
              onClick={() => {
                setShowReferralWelcome(false);
                router.push("/signup");
              }}
              className="block w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] mb-2"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              이메일로 회원가입
            </button>
            <p className="text-[11px] text-brown-pale font-light text-center mb-1">
              카카오 · Google로도 간편 가입 가능
            </p>
            <div className="h-[1px] bg-brown-pale/15 my-2" />
            <button
              onClick={() => setShowReferralWelcome(false)}
              className="block w-full py-2 text-xs font-light text-brown-pale transition-all"
            >
              먼저 둘러볼게요
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
