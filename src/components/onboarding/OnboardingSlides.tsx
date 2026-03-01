"use client";

import { useState } from "react";

const slides = [
  {
    icon: "🫧",
    accent: "#7FBFB0",
    title: "마음을 쏟아내세요",
    body: "어떤 감정이든 괜찮아요.\n판단 없이 따뜻한 대화로\n어머니의 이야기에 귀 기울입니다.\n\n약 15~20분이면 충분해요",
  },
  {
    icon: "✨",
    accent: "#6D4C91",
    title: "상처가 동화로",
    body: "어머니의 경험 속 아픔이\n아이를 위한 세상에 하나뿐인\n치유 동화로 다시 태어납니다.",
  },
  {
    icon: "💬",
    accent: "#E07A5F",
    title: "소중한 목소리를 들려주세요",
    body: "체험 후 간단한 피드백을 남겨주시면\n더 따뜻한 서비스를 만드는 데\n큰 힘이 됩니다.",
  },
];

interface OnboardingSlidesProps {
  onDone: () => void;
}

export function OnboardingSlides({ onDone }: OnboardingSlidesProps) {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const go = (next: boolean) => {
    if (transitioning) return; // Prevent multi-tap skipping/crash
    setTransitioning(true);
    setAnim(false);
    setTimeout(() => {
      if (next) {
        setIdx((i) => Math.min(i + 1, slides.length - 1));
      } else {
        onDone();
      }
      setAnim(true);
      setTransitioning(false);
    }, 250);
  };

  const s = slides[idx];
  const isLast = idx === slides.length - 1;

  return (
    <div className="min-h-dvh bg-cream flex flex-col font-sans pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1">
      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center pt-5">
        {slides.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-sm transition-all duration-[400ms]"
            style={{
              width: i === idx ? 22 : 6,
              background: i === idx ? s.accent : "rgba(0,0,0,0.07)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-10 text-center transition-all duration-[250ms]"
        style={{
          opacity: anim ? 1 : 0,
          transform: anim ? "none" : "translateY(10px)",
        }}
      >
        <div
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[40px] mb-8"
          style={{
            background: `${s.accent}10`,
            border: `1px solid ${s.accent}15`,
          }}
        >
          {s.icon}
        </div>

        <h2 className="font-serif text-[22px] text-brown font-semibold mb-4 leading-tight">
          {s.title}
        </h2>

        <p className="text-sm text-brown-light leading-8 font-light whitespace-pre-line break-keep">
          {s.body}
        </p>
      </div>

      {/* Buttons */}
      <div className="px-8 pb-5">
        <button
          onClick={() => go(!isLast)}
          disabled={transitioning}
          className="w-full py-4 rounded-full text-white text-[15px] font-sans font-medium cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${s.accent}, ${s.accent}CC)`,
            boxShadow: `0 6px 24px ${s.accent}30`,
          }}
        >
          {isLast ? "대화 시작하기" : "다음"}
        </button>

        {!isLast && (
          <button
            onClick={onDone}
            disabled={transitioning}
            className="block w-full mt-3.5 bg-transparent border-none text-[13px] text-brown-pale cursor-pointer font-sans py-2.5 disabled:opacity-40"
          >
            건너뛰기
          </button>
        )}
      </div>
      <div className="h-3" />
      </div>
    </div>
  );
}
