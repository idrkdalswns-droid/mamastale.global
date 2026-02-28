"use client";

import { useState, useEffect } from "react";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { PHASES } from "@/lib/constants/phases";
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides";
import { ChatPage } from "@/components/chat/ChatContainer";
import { StoryViewer } from "@/components/story/StoryViewer";
import { FeedbackWizard } from "@/components/feedback/FeedbackWizard";
import { CommunityPage } from "@/components/feedback/CommunityPage";
import { useChatStore } from "@/lib/hooks/useChat";

type ScreenState = "landing" | "onboarding" | "chat" | "story" | "feedback" | "community";

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [show, setShow] = useState(false);
  const { completedScenes, reset } = useChatStore();

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

      <div
        className="flex-1 flex flex-col justify-center px-8 relative z-[1] transition-all duration-1000"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "none" : "translateY(24px)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Beta badge */}
        <div className="inline-flex self-start px-3.5 py-1.5 rounded-full bg-brown-pale/10 border border-brown-pale/15 mb-6">
          <span className="text-[11px] text-brown-mid font-sans font-medium tracking-[2px]">
            BETA TEST
          </span>
        </div>

        <h1 className="font-serif text-[38px] font-bold text-brown tracking-tight leading-[1.15] mb-2.5">
          mamastale
        </h1>

        <p className="font-serif text-base text-brown-light font-normal leading-relaxed mb-10 tracking-wide">
          나의 과거가 아이의 동화가 되다
        </p>

        {/* Description card */}
        <div className="bg-white/55 backdrop-blur-xl rounded-[22px] p-6 border border-brown-pale/10 mb-8">
          <p className="text-sm text-brown-light leading-8 font-sans font-light break-keep">
            엄마의 상처와 이야기가{" "}
            <span className="text-coral font-medium">세상에 하나뿐인 동화</span>
            가 됩니다.
            <br /><br />
            AI 상담사와 대화하며 4단계 치유 여정을 체험하고,
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

        {/* CTA button */}
        <button
          onClick={() => setScreen("onboarding")}
          className="w-full py-4 rounded-full text-white text-base font-sans font-medium cursor-pointer tracking-wide transition-transform active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #D4836B)",
            boxShadow: "0 8px 28px rgba(224,122,95,0.3)",
          }}
        >
          체험 시작하기
        </button>
      </div>

      <div className="px-8 py-4 pb-6 text-center relative z-[1]">
        <p className="text-[11px] text-brown-pale leading-relaxed font-sans font-light">
          본 서비스는 실제 의료 행위를 대체하지 않습니다
          <br />
          베타 테스트 · 체험 후 피드백을 남겨주세요
        </p>
      </div>
    </div>
  );
}
