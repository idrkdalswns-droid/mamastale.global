"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { PHASES } from "@/lib/constants/phases";
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides";
import { ChatPage } from "@/components/chat/ChatContainer";
import { StoryViewer } from "@/components/story/StoryViewer";
import { FeedbackWizard } from "@/components/feedback/FeedbackWizard";
import { CommunityPage } from "@/components/feedback/CommunityPage";
import { useChatStore } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";

type ScreenState = "landing" | "onboarding" | "chat" | "story" | "feedback" | "community";

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [show, setShow] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showNoTickets, setShowNoTickets] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const { completedScenes, reset } = useChatStore();
  const { user, loading: authLoading, signOut } = useAuth();

  // Detect payment success from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);

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
        onBack={() => setScreen("feedback")}
      />
    );
  }

  if (screen === "feedback") {
    return <FeedbackWizard onRestart={() => setScreen("community")} />;
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
    <div className="min-h-dvh bg-cream flex flex-col relative overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <WatercolorBlob top={-80} right={-100} size={280} color="rgba(232,168,124,0.07)" />
      <WatercolorBlob bottom={100} left={-80} size={240} color="rgba(184,216,208,0.08)" />
      <WatercolorBlob top="35%" right={-40} size={180} color="rgba(200,184,216,0.06)" />

      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 relative z-[2]">
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

      <div
        className="flex-1 flex flex-col justify-center px-8 relative z-[1] transition-all duration-1000"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "none" : "translateY(24px)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Welcome message for logged-in users */}
        {user && !authLoading && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-mint/20 border border-mint/30">
            <p className="text-sm text-brown font-light">
              🌿 <span className="font-medium">{user.user_metadata?.name || user.email?.split("@")[0]}</span>님, 다시 오신 것을 환영합니다
            </p>
          </div>
        )}

        <h1 className="font-serif text-[38px] font-bold text-brown tracking-tight leading-[1.15] mb-2.5">
          mamastale
        </h1>

        <p className="font-serif text-base text-brown-light font-normal leading-relaxed mb-10 tracking-wide">
          나의 이야기가 아이의 동화가 되다
        </p>

        {/* Description card */}
        <div className="bg-white/55 backdrop-blur-xl rounded-[22px] p-6 border border-brown-pale/10 mb-8">
          <p className="text-sm text-brown-light leading-8 font-sans font-light break-keep">
            엄마의 삶이 아이를 위한{" "}
            <span className="text-coral font-medium">세상에 하나뿐인 동화</span>
            가 됩니다.
            <br /><br />
            따뜻한 대화를 나누며 4단계 치유 여정을 체험하고,
            아이에게 들려줄 나만의 동화를 만들어 보세요.
          </p>
        </div>

        {/* Phase pills */}
        <div className="grid grid-cols-2 gap-2 mb-9">
          {Object.values(PHASES).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-[14px]"
              style={{
                background: `${p.accent}0D`,
                border: `1px solid ${p.accent}18`,
              }}
            >
              <span className="text-base flex-shrink-0">{p.icon}</span>
              <div>
                <div
                  className="text-xs font-semibold font-sans leading-tight"
                  style={{ color: p.text }}
                >
                  {p.name}
                </div>
                <div
                  className="text-[10px] font-sans font-light"
                  style={{ color: p.text, opacity: 0.55 }}
                >
                  {p.theory}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ticket balance display for logged-in users */}
        {user && ticketsRemaining !== null && (
          <div className="flex items-center justify-center gap-2 mb-4 px-4 py-2.5 rounded-2xl bg-white/50 border border-brown-pale/10">
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

        {/* CTA buttons */}
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
          <div className="flex gap-3 mt-4">
            <Link
              href="/library"
              className="flex-1 py-3 rounded-full text-sm font-medium text-center no-underline transition-all active:scale-[0.97]"
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
              className="flex-1 py-3 rounded-full text-sm font-medium text-center no-underline transition-all active:scale-[0.97]"
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
      </div>

      <div className="px-8 py-4 pb-6 text-center relative z-[1]">
        <p className="text-[11px] text-brown-pale leading-relaxed font-sans font-light">
          본 서비스는 실제 의료 행위를 대체하지 않습니다
          <br />
          베타 테스트 · 체험 후 피드백을 남겨주세요
        </p>
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
    </div>
  );
}
