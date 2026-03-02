"use client";

import { useState } from "react";

const CHILD_AGE_OPTIONS = [
  { value: "", label: "선택 안함" },
  { value: "0-2", label: "0~2세 (영아)" },
  { value: "3-5", label: "3~5세 (유아)" },
  { value: "6-8", label: "6~8세 (초등 저학년)" },
];

interface Slide {
  step: number; // 0 = no step badge
  persona: string;
  icon: string;
  accent: string;
  title: string;
  body: string;
}

const slides: Slide[] = [
  {
    step: 1,
    persona: "공감적 상담사",
    icon: "🫧",
    accent: "#7FBFB0",
    title: "먼저, 편안하게\n마음을 열어주세요",
    body: "가장 먼저 만나는 건\n어떤 이야기든 판단 없이 들어주는\n따뜻한 대화 상대예요.\n\n오래 참아온 감정도, 꺼내기 어려운 이야기도\n여기선 있는 그대로 괜찮아요.",
  },
  {
    step: 2,
    persona: "소크라테스식 철학자",
    icon: "🌿",
    accent: "#E07A5F",
    title: "굳어진 마음에\n새 빛이 들어와요",
    body: "부드러운 질문 하나가\n오랫동안 당연하다고 여겼던 생각에\n작은 틈을 만들어 줍니다.\n\n'정말 나만의 잘못이었을까?'\n함께 천천히 풀어가요.",
  },
  {
    step: 3,
    persona: "은유의 마법사",
    icon: "✨",
    accent: "#8B6AAF",
    title: "아픔이 이야기 속\n캐릭터가 돼요",
    body: "어머니의 감정과 경험이\n은유라는 마법을 만나\n동화 속 캐릭터로 다시 태어납니다.\n\n내 이야기이지만, 내가 아닌\n새로운 존재로.",
  },
  {
    step: 4,
    persona: "동화 편집장",
    icon: "📖",
    accent: "#C4956A",
    title: "세상에 하나뿐인\n동화가 완성돼요",
    body: "아이의 눈높이에 맞춘\n10장면의 마음 동화가 만들어집니다.\n\n어머니의 상처가\n아이를 위한 사랑의 이야기로.\n\n약 15~20분이면 충분해요",
  },
  {
    step: 0,
    persona: "",
    icon: "🌱",
    accent: "#7FBFB0",
    title: "시작하기 전에",
    body: "_childAge_", // special marker — rendered as custom form below
  },
];

interface OnboardingSlidesProps {
  onDone: () => void;
}

export function OnboardingSlides({ onDone }: OnboardingSlidesProps) {
  // Returning users skip to age selection slide directly
  const hasSeenOnboarding = (() => {
    try { return localStorage.getItem("mamastale_onboarding_done") === "1"; } catch { return false; }
  })();
  const [idx, setIdx] = useState(hasSeenOnboarding ? slides.length - 1 : 0);
  const [anim, setAnim] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  // Restore previous child age selection for returning users
  const [childAge, setChildAge] = useState(() => {
    try { return localStorage.getItem("mamastale_child_age") || ""; } catch { return ""; }
  });

  const saveAndDone = () => {
    try {
      if (childAge) localStorage.setItem("mamastale_child_age", childAge);
      localStorage.setItem("mamastale_onboarding_done", "1");
    } catch {}
    onDone();
  };

  const go = (next: boolean) => {
    if (transitioning) return; // Prevent multi-tap skipping/crash
    setTransitioning(true);
    setAnim(false);
    setTimeout(() => {
      if (next) {
        setIdx((i) => Math.min(i + 1, slides.length - 1));
      } else {
        saveAndDone();
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
      {/* KR-10: Progress dots with accessible tablist pattern */}
      <div className="flex gap-1.5 justify-center pt-5" role="tablist" aria-label="온보딩 단계">
        {slides.map((_, i) => (
          <div
            key={i}
            role="tab"
            aria-selected={i === idx}
            aria-label={`${i + 1}단계${i === idx ? " (현재)" : ""}`}
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
        {/* Step badge — only for persona slides */}
        {s.step > 0 && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide mb-5"
            style={{
              background: `${s.accent}12`,
              color: s.accent,
              border: `1px solid ${s.accent}20`,
            }}
          >
            <span>{s.step}단계</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{s.persona}</span>
          </div>
        )}

        <div
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[40px] mb-7"
          style={{
            background: `${s.accent}10`,
            border: `1px solid ${s.accent}15`,
          }}
        >
          {s.icon}
        </div>

        <h2 className="font-serif text-[22px] text-brown font-semibold mb-5 leading-[1.5] whitespace-pre-line">
          {s.title}
        </h2>

        {s.body === "_childAge_" ? (
          <div className="w-full max-w-xs space-y-5">
            {/* Child age selector */}
            <div>
              <label className="block text-xs text-brown-pale font-light mb-2 text-left">
                아이의 연령대 (선택)
              </label>
              <select
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm bg-white/70 border border-brown-pale/15 text-brown outline-none"
                aria-label="자녀 연령대 선택"
              >
                {CHILD_AGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-brown-pale font-light mt-1.5 text-left">
                동화의 언어 수준이 아이 연령에 맞게 조절됩니다<br />
                자녀가 여러 명이면 동화를 들려줄 아이 기준으로 선택해 주세요
              </p>
            </div>

            {/* Informed consent note */}
            <div
              className="rounded-xl p-4 text-left"
              style={{ background: "rgba(127,191,176,0.08)", border: "1px solid rgba(127,191,176,0.15)" }}
            >
              <p className="text-xs text-brown-light leading-6 font-light break-keep">
                이 대화는 깊은 감정을 다룰 수 있습니다.
                현재 심리적으로 많이 힘드신 상황이라면
                전문 상담을 먼저 권합니다.
              </p>
              <p className="text-[10px] text-brown-pale font-light mt-2 leading-5">
                자살예방상담전화 <a href="tel:1393" className="underline font-medium text-brown-light">1393</a> (24시간)
                <br />
                해외 거주 시 <a href="tel:988" className="underline font-medium text-brown-light">988</a> Suicide & Crisis Lifeline (미국)
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-brown-light leading-8 font-normal whitespace-pre-line break-keep">
            {s.body}
          </p>
        )}
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
            onClick={() => {
              // Skip to the last slide (age selection) instead of skipping entirely
              if (transitioning) return;
              setTransitioning(true);
              setAnim(false);
              setTimeout(() => {
                setIdx(slides.length - 1);
                setAnim(true);
                setTransitioning(false);
              }, 250);
            }}
            disabled={transitioning}
            className="block w-full mt-3.5 bg-transparent border-none text-[13px] text-brown-mid cursor-pointer font-sans py-2.5 disabled:opacity-40 underline underline-offset-2 decoration-brown-pale/30"
          >
            건너뛰고 바로 시작하기
          </button>
        )}
      </div>
      <div className="h-3" />
      </div>
    </div>
  );
}
