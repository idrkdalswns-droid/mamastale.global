"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { hapticLight, hapticSuccess } from "@/lib/utils/haptic";
import { trackOnboardingStart, trackOnboardingComplete } from "@/lib/utils/analytics";
import { nameWithParticle } from "@/lib/utils/korean";

const PARENT_ROLE_OPTIONS = [
  { value: "아빠", label: "아빠" },
  { value: "할머니", label: "할머니" },
  { value: "할아버지", label: "할아버지" },
  { value: "기타", label: "기타 보호자" },
];

const CHILD_AGE_OPTIONS = [
  { value: "0-2", label: "0~2세", img: "/images/onboarding/age-0-2-1.jpeg", desc: "의성어와 반복이 가득한 동화가 만들어져요", pos: "center" },
  { value: "3-5", label: "3~5세", img: "/images/onboarding/age-3-5.jpeg", desc: "감각적이고 대화가 있는 동화가 만들어져요", pos: "center" },
  { value: "6-8", label: "6~8세", img: "/images/onboarding/age-6-8.jpeg", desc: "은유와 내면을 담은 동화가 만들어져요", pos: "center" },
  { value: "9-13", label: "9~13세", img: "/images/onboarding/age-9-13.jpeg", desc: "깊은 이야기와 복합적인 동화가 만들어져요", pos: "left center" },
];

const STEPS = [
  { icon: "/images/teacher/phase/phase-a.jpeg", label: "대화", accent: "#7FBFB0" },
  { icon: "/images/teacher/phase/phase-b.jpeg", label: "발견", accent: "#E07A5F" },
  { icon: "/images/teacher/phase/phase-c.jpeg", label: "은유", accent: "#8B6AAF" },
  { icon: "/images/teacher/phase/phase-d.jpeg", label: "동화", accent: "#C4956A" },
];

interface OnboardingSlidesProps {
  onDone: () => void;
  onGoHome?: () => void;
}

export function OnboardingSlides({ onDone, onGoHome }: OnboardingSlidesProps) {
  const [childName, setChildName] = useState(() => {
    try { return localStorage.getItem("mamastale_child_name") || ""; } catch { return ""; }
  });
  const [childAge, setChildAge] = useState(() => {
    try { return localStorage.getItem("mamastale_child_age") || ""; } catch { return ""; }
  });
  const [parentRole, setParentRole] = useState(() => {
    try { return localStorage.getItem("mamastale_parent_role") || "엄마"; } catch { return "엄마"; }
  });

  // C1: Track onboarding start
  useEffect(() => { trackOnboardingStart(); }, []);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  const saveAndDone = () => {
    try {
      localStorage.setItem("mamastale_parent_role", parentRole);
      if (childAge) localStorage.setItem("mamastale_child_age", childAge);
      if (childName.trim()) localStorage.setItem("mamastale_child_name", childName.trim());
      localStorage.setItem("mamastale_onboarding_done", "1");
    } catch {}
    hapticSuccess();
    trackOnboardingComplete(parentRole, childAge);
    onDone();
  };

  const selectedAgeOption = CHILD_AGE_OPTIONS.find((o) => o.value === childAge);

  // CTA 텍스트: 아이 이름이 있으면 개인화
  const ctaText = childName.trim()
    ? `${nameWithParticle(childName.trim(), "이를", "를")} 위한 이야기 시작하기`
    : "이야기 시작하기";

  return (
    <div className="min-h-dvh bg-cream flex flex-col font-sans pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1">
        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">

          {/* 4-step flow icons */}
          <div className="flex items-center gap-2 mb-1.5">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-5 h-5 rounded-full overflow-hidden relative">
                    <Image src={step.icon} alt={step.label} fill className="object-cover" sizes="20px" />
                  </div>
                  <span className="text-[9px] font-light" style={{ color: step.accent }}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="text-[10px] text-brown-pale/40 -mt-2.5">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-brown-pale font-light mb-7">약 15분이면 충분해요</p>

          {/* Child name input */}
          <h2
            className="text-[20px] font-semibold mb-4 text-center leading-snug"
            style={{ color: "rgb(var(--brown))", fontFamily: "'Nanum Myeongjo', serif" }}
          >
            아이 이름을 알려주세요
          </h2>
          <input
            type="text"
            value={childName}
            onChange={(e) => {
              const v = e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s]/g, "").slice(0, 10);
              setChildName(v);
            }}
            maxLength={10}
            placeholder="예: 서연, 민준, 하은"
            className="w-full max-w-[240px] px-4 py-3 rounded-xl text-center text-sm font-light text-brown outline-none transition-all focus:ring-2 focus:ring-[#7FBFB0]/30"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(196,149,106,0.15)",
            }}
            aria-label="아이 이름 (선택)"
          />
          <p className="text-[10px] text-brown-pale font-light mt-1.5 mb-6">선택사항이에요</p>

          {/* Child age selector */}
          <h3
            className="text-[15px] font-medium mb-1 text-center"
            style={{ color: "rgb(var(--brown))" }}
          >
            아이는 몇 살인가요?
          </h3>
          <p className="text-[12px] text-brown-light font-light mb-4 text-center break-keep">
            연령에 맞는 언어로 동화를 만들어 드려요
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-[280px]">
            {CHILD_AGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { setChildAge(o.value); hapticLight(); }}
                className="flex flex-col items-center gap-2 transition-all active:scale-[0.96]"
                aria-pressed={childAge === o.value}
              >
                <div
                  className="relative w-full rounded-2xl overflow-hidden"
                  style={{
                    aspectRatio: "1",
                    border: childAge === o.value
                      ? "2.5px solid #7FBFB0"
                      : "1.5px solid rgba(196,149,106,0.1)",
                    boxShadow: childAge === o.value
                      ? "0 6px 20px rgba(127,191,176,0.2)"
                      : "0 2px 8px rgba(90,62,43,0.04)",
                  }}
                >
                  <Image
                    src={o.img}
                    alt={o.label}
                    fill
                    sizes="140px"
                    className="object-cover"
                    style={{ objectPosition: o.pos }}
                  />
                </div>
                <span
                  className="text-[11px] tracking-wide"
                  style={{
                    fontFamily: "'Nanum Myeongjo', serif",
                    color: childAge === o.value ? "#5FA89A" : "rgb(var(--brown-light))",
                    fontWeight: childAge === o.value ? 600 : 400,
                  }}
                >
                  {o.label}
                </span>
              </button>
            ))}
          </div>

          {/* Micro-feedback on age selection */}
          <div className="h-8 flex items-center justify-center mt-2">
            {selectedAgeOption ? (
              <p
                className="text-[11px] text-brown-light font-light text-center transition-opacity duration-300"
                style={{ opacity: 1 }}
              >
                {selectedAgeOption.desc}
              </p>
            ) : (
              <p className="text-[11px] text-brown-pale/50 font-light text-center">
                선택하지 않아도 시작할 수 있어요
              </p>
            )}
          </div>

          {/* Freemium v2: First story free notice */}
          <p className="text-[11px] text-mint-deep font-medium text-center mt-3 mb-1">
            첫 동화는 무료로 완성할 수 있어요
          </p>

          {/* Testimonial */}
          <p className="text-[11px] text-brown-light/60 italic text-center mt-1 mb-2">
            &ldquo;아이가 매일 읽어달라고 해요&rdquo;
            <span className="not-italic text-brown-pale"> — 준우맘</span>
          </p>

        </div>

        {/* Fixed bottom area — CTA + role selector + crisis info */}
        <div className="shrink-0 px-8 pb-5 pt-3">
          <button
            type="button"
            onClick={saveAndDone}
            className="w-full py-4 rounded-full text-white text-[15px] font-sans font-medium cursor-pointer transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #7FBFB0, #5FA89A)",
              boxShadow: "0 6px 24px rgba(127,191,176,0.3)",
            }}
          >
            {ctaText}
          </button>

          {/* Parent role — collapsed link */}
          <div className="flex justify-center mt-3">
            {parentRole === "엄마" && !showRoleSelector ? (
              <button
                type="button"
                onClick={() => setShowRoleSelector(true)}
                className="text-[11px] text-brown-pale underline underline-offset-2 decoration-brown-pale/30 min-h-[32px] flex items-center"
              >
                다른 보호자이신가요?
              </button>
            ) : showRoleSelector ? (
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => { setParentRole("엄마"); setShowRoleSelector(false); hapticLight(); }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                  style={{
                    background: parentRole === "엄마" ? "linear-gradient(135deg, #E07A5F, #C96B52)" : "rgba(255,255,255,0.7)",
                    color: parentRole === "엄마" ? "#FFF" : "#5A3E2B",
                    border: "1px solid rgba(196,149,106,0.15)",
                  }}
                  aria-pressed={parentRole === "엄마"}
                >
                  엄마
                </button>
                {PARENT_ROLE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { setParentRole(o.value); setShowRoleSelector(false); hapticLight(); }}
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                    style={{
                      background: parentRole === o.value ? "linear-gradient(135deg, #E07A5F, #C96B52)" : "rgba(255,255,255,0.7)",
                      color: parentRole === o.value ? "#FFF" : "#5A3E2B",
                      border: "1px solid rgba(196,149,106,0.15)",
                    }}
                    aria-pressed={parentRole === o.value}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowRoleSelector(true)}
                className="text-[11px] text-brown-light min-h-[32px] flex items-center"
              >
                {parentRole === "기타" ? "기타 보호자" : parentRole}로 설정됨 · <span className="underline underline-offset-2 decoration-brown-pale/30 ml-0.5">변경</span>
              </button>
            )}
          </div>

          {/* Crisis info — minimal */}
          <p className="text-[12px] text-brown-pale/70 font-light text-center mt-3 break-keep">
            힘드실 땐{" "}
            <a href="tel:1393" className="underline text-brown-pale">1393</a>(자살예방) ·{" "}
            <a href="tel:1577-0199" className="underline text-brown-pale">1577-0199</a>(정신건강)
          </p>

          {onGoHome && (
            <button
              type="button"
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
