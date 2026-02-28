"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { PHASES } from "@/lib/constants/phases";
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides";
import { ChatPage } from "@/components/chat/ChatContainer";
import { StoryViewer } from "@/components/story/StoryViewer";
import { FeedbackWizard } from "@/components/feedback/FeedbackWizard";
import { CommunityPage } from "@/components/feedback/CommunityPage";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type ScreenState = "landing" | "onboarding" | "chat" | "story" | "feedback" | "community";

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [show, setShow] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showNoTickets, setShowNoTickets] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const { completedScenes, sessionId: chatSessionId, reset, restoreFromStorage } = useChatStore();
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Auto-restore chat after signup/login
  // If user just signed up/logged in and has saved chat state → resume chat
  useEffect(() => {
    if (authLoading || screen !== "landing") return;
    if (!user) return;

    const restored = restoreFromStorage();
    if (restored) {
      setScreen("chat");
    }
  }, [authLoading, user, restoreFromStorage, screen]);

  // Detect URL params: payment success + referral code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
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
  useEffect(() => {
    if (!user) {
      setTicketsRemaining(null);
      return;
    }
    fetch("/api/tickets")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setTicketsRemaining(data.remaining ?? 0);
      })
      .catch(() => {});
  }, [user, showPaymentSuccess]); // re-fetch after payment success

  // Handle "새 동화 만들기" click with ticket check
  const handleStartStory = () => {
    if (user && ticketsRemaining !== null && ticketsRemaining <= 0) {
      setShowNoTickets(true);
      return;
    }
    setScreen("onboarding");
  };

  const closePaymentModal = useCallback(() => {
    setShowPaymentSuccess(false);
  }, []);

  // Trigger landing fade-in (HIGH-2 fix: moved to useEffect)
  useEffect(() => {
    if (screen === "landing") {
      requestAnimationFrame(() => setShow(true));
    }
  }, [screen]);

  if (screen === "onboarding") {
    return <OnboardingSlides onDone={() => setScreen("chat")} />;
  }

  // CRITICAL-2 fix: chat completes → story viewer (not directly to feedback)
  if (screen === "chat") {
    return <ChatPage onComplete={() => setScreen("story")} />;
  }

  // New: Story viewing screen between chat and feedback
  if (screen === "story") {
    return (
      <StoryViewer
        scenes={completedScenes}
        title="나의 치유 동화"
        authorName={user?.user_metadata?.name || undefined}
        onBack={() => setScreen("feedback")}
        onBackLabel="피드백 남기기 →"
      />
    );
  }

  if (screen === "feedback") {
    return <FeedbackWizard sessionId={chatSessionId} onRestart={() => setScreen("community")} />;
  }

  if (screen === "community") {
    return (
      <CommunityPage
        onRestart={() => {
          reset(); // LOW-11 fix: reset chat store
          setShow(false);
          setScreen("landing");
        }}
      />
    );
  }

  return (
    <div className="h-dvh bg-cream flex flex-col relative overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* Background hero image */}
      <Image
        src="/images/hero.jpg"
        alt=""
        fill
        priority
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
        <span className="text-[11px] text-brown-mid font-sans font-medium tracking-[2px] px-3 py-1.5 rounded-full bg-brown-pale/10 border border-brown-pale/15">
          BETA
        </span>
        {!authLoading && (
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/library"
                  className="text-xs text-brown-mid font-medium no-underline hover:text-coral transition-colors"
                >
                  내 서재
                </Link>
                <Link
                  href="/community"
                  className="text-xs text-brown-mid font-medium no-underline hover:text-coral transition-colors"
                >
                  커뮤니티
                </Link>
                <button
                  onClick={signOut}
                  className="text-xs text-brown-pale font-light"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs text-brown-mid font-medium no-underline"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="text-xs text-white font-medium no-underline px-3 py-1.5 rounded-full"
                  style={{ background: "linear-gradient(135deg, #E07A5F, #D4836B)" }}
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
                🌿 <span className="font-medium">{user.user_metadata?.name || user.email?.split("@")[0]}</span>님, 환영합니다
              </p>
            </div>
          )}

          <h1 className="font-serif text-[36px] font-bold text-brown tracking-tight leading-[1.15] mb-2">
            mamastale
          </h1>

          <p className="font-serif text-[15px] text-brown-light font-normal leading-relaxed mb-5 tracking-wide">
            나의 이야기가 아이의 동화가 되다
          </p>

          {/* Description card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-[20px] p-5 border border-brown-pale/10 mb-5">
            <p className="text-[13px] text-brown-light leading-7 font-sans font-light break-keep">
              엄마의 삶이 아이를 위한{" "}
              <span className="text-coral font-medium">세상에 하나뿐인 동화</span>
              가 됩니다.
              <br />
              따뜻한 대화를 나누며 4단계 치유 여정을 체험하고,
              아이에게 들려줄 나만의 동화를 만들어 보세요.
            </p>
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
                    className="text-[9px] font-sans font-light"
                    style={{ color: p.text, opacity: 0.55 }}
                  >
                    {p.theory}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section: ticket + CTA + links */}
        <div>
          {/* Ticket balance display for logged-in users */}
          {user && ticketsRemaining !== null && (
            <div className="flex items-center justify-center gap-2 mb-3 px-4 py-2 rounded-2xl bg-white/50 border border-brown-pale/10">
              <span className="text-sm">🎫</span>
              <span className="text-xs text-brown font-medium">
                남은 티켓: <span className="text-coral font-bold">{ticketsRemaining}장</span>
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

          {/* CTA button */}
          <button
            onClick={handleStartStory}
            className="w-full py-4 rounded-full text-white text-base font-sans font-medium cursor-pointer tracking-wide transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
              boxShadow: "0 8px 28px rgba(224,122,95,0.3)",
            }}
          >
            {user ? "새 동화 만들기" : "체험 시작하기"}
          </button>

          {/* Quick links for logged-in users */}
          {user && !authLoading && (
            <div className="flex gap-3 mt-3">
              <Link
                href="/library"
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-center no-underline transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(127,191,176,0.12)",
                  color: "#5A9E8F",
                  border: "1.5px solid rgba(127,191,176,0.25)",
                }}
              >
                📚 내 서재
              </Link>
              <Link
                href="/community"
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-center no-underline transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(200,184,216,0.12)",
                  color: "#6D4C91",
                  border: "1.5px solid rgba(200,184,216,0.25)",
                }}
              >
                🌍 커뮤니티
              </Link>
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
                  // Fallback: use share API on mobile
                  if (navigator.share) {
                    navigator.share({
                      title: "mamastale 추천",
                      text: "엄마의 이야기가 아이의 동화가 되는 곳, mamastale을 추천합니다!",
                      url,
                    });
                  }
                });
              }}
              className="w-full mt-2 py-2.5 rounded-full text-xs font-medium transition-all active:scale-[0.97]"
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
                ? "✅ 추천 링크가 복사되었어요!"
                : "🎁 친구 추천하고 무료 티켓 받기"}
            </button>
          )}

          {/* Footer disclaimer */}
          <p className="text-[10px] text-brown-pale leading-relaxed font-sans font-light text-center mt-4">
            본 서비스는 실제 의료 행위를 대체하지 않습니다 · 베타 테스트
          </p>
        </div>
      </div>

      {/* No Tickets Modal */}
      {showNoTickets && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div className="text-[56px] mb-4">🎫</div>
            <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
              티켓이 필요해요
            </h2>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
              동화를 만들려면 티켓이 필요합니다.<br />
              티켓을 구매하고 나만의<br />
              <span className="text-coral font-medium">치유 동화</span>를 만들어 보세요.
            </p>
            <Link
              href="/pricing"
              onClick={() => setShowNoTickets(false)}
              className="block w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97] mb-3"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #D4836B)",
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

      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div className="text-[56px] mb-4">🌷</div>
            <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
              감사합니다, 어머니
            </h2>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-2 break-keep">
              티켓 구매가 완료되었어요.
            </p>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
              이제 아이를 위한 아름다운<br />
              <span className="text-coral font-medium">세상에 하나뿐인 치유 동화</span>를<br />
              만들어 볼까요?
            </p>
            <button
              onClick={() => {
                closePaymentModal();
                setScreen("onboarding");
              }}
              className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-transform active:scale-[0.97] mb-3"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #D4836B)",
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
      {/* Referral Welcome Modal */}
      {showReferralWelcome && !user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div className="text-[56px] mb-3">🎁</div>
            <h2 className="font-serif text-xl font-bold text-brown mb-2 leading-tight">
              친구가 초대했어요!
            </h2>
            <p className="text-[13px] text-brown-light font-light leading-relaxed mb-4 break-keep">
              <span className="text-coral font-semibold">mamastale</span>은
              엄마의 이야기를 아이를 위한{" "}
              <span className="text-coral font-medium">세상에 하나뿐인 치유 동화</span>
              로 만들어주는 서비스예요.
            </p>
            <div
              className="rounded-2xl p-4 mb-5"
              style={{ background: "rgba(224,122,95,0.08)", border: "1.5px solid rgba(224,122,95,0.15)" }}
            >
              <p className="text-sm text-brown font-medium leading-relaxed break-keep">
                🎫 지금 회원가입하시면<br />
                <span className="text-coral font-bold text-base">무료 티켓 1장</span>을 드려요!
              </p>
              <p className="text-[11px] text-brown-pale font-light mt-1">
                추천인에게도 티켓 1장이 지급됩니다
              </p>
            </div>

            <button
              disabled
              className="block w-full py-3.5 rounded-full text-sm font-medium opacity-50 cursor-not-allowed mb-2"
              style={{ background: "#FEE500", color: "#3C1E1E" }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
                </svg>
                카카오로 시작하기 (준비중)
              </span>
            </button>
            <button
              disabled
              className="block w-full py-3 rounded-full text-sm font-medium opacity-50 cursor-not-allowed mb-2"
              style={{ background: "#fff", color: "#444", border: "1.5px solid rgba(0,0,0,0.1)" }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 시작하기 (준비중)
              </span>
            </button>
            <button
              onClick={() => {
                setShowReferralWelcome(false);
                router.push("/signup");
              }}
              className="block w-full py-2.5 text-xs font-light text-brown-mid transition-all"
            >
              이메일로 회원가입
            </button>
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
