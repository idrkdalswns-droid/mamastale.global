"use client";

import { useState, useRef, useEffect } from "react";

const PARENT_ROLE_OPTIONS = [
  { value: "엄마", label: "엄마" },
  { value: "아빠", label: "아빠" },
  { value: "할머니", label: "할머니" },
  { value: "할아버지", label: "할아버지" },
  { value: "기타", label: "기타 보호자" },
];

const PARENT_AGE_OPTIONS = [
  { value: "10s", label: "10대" },
  { value: "20s", label: "20대" },
  { value: "30s", label: "30대" },
  { value: "40s", label: "40대" },
  { value: "50+", label: "50대 이상" },
];

const CHILD_AGE_OPTIONS = [
  { value: "0-2", label: "0~2세" },
  { value: "3-5", label: "3~5세" },
  { value: "6-8", label: "6~8세" },
  { value: "9-13", label: "9~13세" },
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
    persona: "하은이 · 감정 표현 안내자",
    icon: "1",
    accent: "#7FBFB0",
    title: "먼저, 편안하게\n마음을 열어주세요",
    body: "하은이는 펜네베이커(Pennebaker)의\n표현적 글쓰기 원리로 대화합니다.\n\n말로 꺼낸 감정은 '외면화'되어\n더 이상 나를 안에서 조이지 않아요.\n\n판단 없이 들어주는 따뜻한 대화 속에서\n오래 참아온 마음이 자연스럽게 풀립니다.",
  },
  {
    step: 2,
    persona: "민서 · 소크라틱 질문자",
    icon: "2",
    accent: "#E07A5F",
    title: "굳어진 마음에\n새 빛이 들어와요",
    body: "민서는 아이의 순수한 시선으로\n소크라틱 질문을 건넵니다.\n\n'엄마, 그게 정말 엄마 잘못이야?'\n\n이 질문이 오래된 고정관념에\n작은 균열을 만들고,\n전혀 다른 시각에서\n상황을 바라보게 해 줍니다.",
  },
  {
    step: 3,
    persona: "지우 · 은유의 마법사",
    icon: "3",
    accent: "#8B6AAF",
    title: "아픔이 이야기 속\n캐릭터가 돼요",
    body: "지우는 내러티브 테라피 원리로\n어머니의 감정을 동화 캐릭터로 바꿉니다.\n\n슬픔은 '비를 좋아하는 구름 토끼'로,\n불안은 '빛을 무서워하는 작은 반딧불이'로.\n\n감정이 나와 분리된 별개의 존재가 되면\n비로소 돌보고 이해할 수 있게 됩니다.",
  },
  {
    step: 4,
    persona: "서연 · 동화 편집장",
    icon: "4",
    accent: "#C4956A",
    title: "세상에 하나뿐인\n동화가 완성돼요",
    body: "서연이 모든 과정을 엮어\n10장면의 마음 동화를 완성합니다.\n\n어머니의 경험이 동화라는\n안전한 형태로 다시 태어나\n아이에게 읽어줄 수 있는\n일상의 치유 도구가 됩니다.\n\n약 15~20분이면 충분해요.",
  },
  {
    step: 0,
    persona: "",
    icon: "",
    accent: "#7FBFB0",
    title: "시작하기 전에",
    body: "_childAge_", // special marker — rendered as custom form below
  },
];

interface OnboardingSlidesProps {
  onDone: () => void;
  onGoHome?: () => void;
}

export function OnboardingSlides({ onDone, onGoHome }: OnboardingSlidesProps) {
  // Returning users skip to age selection slide directly
  const hasSeenOnboarding = (() => {
    try { return localStorage.getItem("mamastale_onboarding_done") === "1"; } catch { return false; }
  })();
  const [idx, setIdx] = useState(hasSeenOnboarding ? slides.length - 1 : 0);
  const [anim, setAnim] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  // R7-2: Cleanup timeout on unmount to prevent setState on unmounted component
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); }, []);
  // Restore previous selections for returning users
  const [parentRole, setParentRole] = useState(() => {
    try { return localStorage.getItem("mamastale_parent_role") || ""; } catch { return ""; }
  });
  const [parentAge, setParentAge] = useState(() => {
    try { return localStorage.getItem("mamastale_parent_age") || ""; } catch { return ""; }
  });
  const [childAge, setChildAge] = useState(() => {
    try { return localStorage.getItem("mamastale_child_age") || ""; } catch { return ""; }
  });

  const saveAndDone = () => {
    try {
      if (parentRole) localStorage.setItem("mamastale_parent_role", parentRole);
      if (parentAge) localStorage.setItem("mamastale_parent_age", parentAge);
      if (childAge) localStorage.setItem("mamastale_child_age", childAge);
      localStorage.setItem("mamastale_onboarding_done", "1");
    } catch {}
    onDone();
  };

  const go = (next: boolean) => {
    if (transitioning) return; // Prevent multi-tap skipping/crash
    setTransitioning(true);
    setAnim(false);
    // R7-2: Store timer ref for cleanup on unmount
    transitionTimerRef.current = setTimeout(() => {
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
      {/* Progress dots — decorative indicators (not interactive, so role="group" not "tablist") */}
      <div className="flex gap-1.5 justify-center pt-5" role="group" aria-label="온보딩 진행 상태">
        {slides.map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-1.5 rounded-sm transition-all duration-[400ms]"
            style={{
              width: i === idx ? 22 : 6,
              background: i === idx ? s.accent : "rgba(0,0,0,0.07)",
            }}
          />
        ))}
        <span className="sr-only">{idx + 1} / {slides.length} 단계</span>
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

        {s.icon && (
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[28px] font-bold mb-7"
            style={{
              background: `${s.accent}15`,
              border: `2px solid ${s.accent}30`,
              color: s.accent,
            }}
          >
            {s.icon}
          </div>
        )}

        <h2 className="font-serif text-[22px] text-brown font-semibold mb-5 leading-[1.5] whitespace-pre-line">
          {s.title}
        </h2>

        {s.body === "_childAge_" ? (
          <div className="w-full max-w-xs space-y-4">
            {/* Parent role selector — chip buttons */}
            <div>
              <label className="block text-xs text-brown font-medium mb-2.5 text-left">
                아이와의 관계
              </label>
              <div className="flex flex-wrap gap-2">
                {PARENT_ROLE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setParentRole(o.value)}
                    className="px-4 py-2.5 rounded-full text-[13px] font-medium transition-all active:scale-[0.96] min-h-[44px]"
                    style={{
                      background: parentRole === o.value
                        ? "linear-gradient(135deg, #E07A5F, #C96B52)"
                        : "rgba(255,255,255,0.7)",
                      color: parentRole === o.value ? "#FFF" : "#5A3E2B",
                      border: parentRole === o.value
                        ? "1.5px solid transparent"
                        : "1.5px solid rgba(196,149,106,0.2)",
                      boxShadow: parentRole === o.value
                        ? "0 4px 12px rgba(224,122,95,0.25)"
                        : "none",
                    }}
                    aria-pressed={parentRole === o.value}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parent age selector */}
            <div>
              <label className="block text-xs text-brown font-medium mb-2 text-left">
                연령대 (선택)
              </label>
              <div className="flex gap-2">
                {PARENT_AGE_OPTIONS.filter(o => o.value).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setParentAge(o.value)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all active:scale-[0.96] min-h-[44px]"
                    style={{
                      background: parentAge === o.value
                        ? "linear-gradient(135deg, #6D4C91, #8B6FB0)"
                        : "rgba(255,255,255,0.7)",
                      color: parentAge === o.value ? "#FFF" : "#5A3E2B",
                      border: parentAge === o.value
                        ? "1.5px solid transparent"
                        : "1.5px solid rgba(196,149,106,0.2)",
                      boxShadow: parentAge === o.value
                        ? "0 4px 12px rgba(109,76,145,0.25)"
                        : "none",
                    }}
                    aria-pressed={parentAge === o.value}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Child age selector */}
            <div>
              <label className="block text-xs text-brown font-medium mb-2 text-left">
                자녀 연령대 (선택)
              </label>
              <div className="flex gap-2">
                {CHILD_AGE_OPTIONS.filter(o => o.value).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setChildAge(o.value)}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all active:scale-[0.96] min-h-[44px]"
                    style={{
                      background: childAge === o.value
                        ? "linear-gradient(135deg, #7FBFB0, #5FA89A)"
                        : "rgba(255,255,255,0.7)",
                      color: childAge === o.value ? "#FFF" : "#5A3E2B",
                      border: childAge === o.value
                        ? "1.5px solid transparent"
                        : "1.5px solid rgba(196,149,106,0.2)",
                      boxShadow: childAge === o.value
                        ? "0 4px 12px rgba(127,191,176,0.25)"
                        : "none",
                    }}
                    aria-pressed={childAge === o.value}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-brown-pale font-light mt-1.5 text-left">
                동화의 언어 수준이 아이 연령에 맞게 조절됩니다
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
                정신건강위기상담전화 <a href="tel:1577-0199" className="underline font-medium text-brown-light">1577-0199</a> (24시간)
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
            className="block w-full mt-3.5 bg-transparent border-none text-[13px] text-brown-mid cursor-pointer font-sans py-2.5 disabled:opacity-40 underline underline-offset-2 decoration-brown-pale/30 min-h-[44px]"
          >
            건너뛰고 바로 시작하기
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="block w-full mt-2 bg-transparent border-none text-[12px] text-brown-pale cursor-pointer font-sans py-2 font-light min-h-[44px]"
          >
            ← 홈으로 돌아가기
          </button>
        )}
      </div>
      <div className="h-3" />
      </div>
    </div>
  );
}
