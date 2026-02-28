"use client";

import { useState } from "react";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";

const questions = [
  { key: "empathy", label: "Phase 1 · 공감적 치유자", sub: "AI가 감정을 충분히 공감해 주었나요?" },
  { key: "insight", label: "Phase 2 · 소크라테스식 철학자", sub: "질문을 통해 새로운 깨달음이 있었나요?" },
  { key: "metaphor", label: "Phase 3 · 은유의 마법사", sub: "동화 캐릭터 전환이 자연스러웠나요?" },
  { key: "story", label: "Phase 4 · 동화 편집장", sub: "완성된 동화가 가슴에 와닿았나요?" },
  { key: "overall", label: "전체 경험", sub: "다른 엄마에게 추천하고 싶으신가요?" },
  { key: "free", label: "자유 의견", sub: "개선점, 좋았던 점, 불편했던 점 무엇이든 좋습니다" },
];

const faces = [
  { em: "😞", lb: "아쉬워요" },
  { em: "😐", lb: "보통" },
  { em: "🙂", lb: "괜찮아요" },
  { em: "😊", lb: "좋았어요" },
  { em: "🥹", lb: "감동" },
];

interface FeedbackWizardProps {
  onRestart: () => void;
  sessionId?: string;
}

export function FeedbackWizard({ onRestart, sessionId }: FeedbackWizardProps) {
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number | string>>({});
  const [freeText, setFreeText] = useState("");
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(true);

  const rate = (key: string, val: number) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
    // LOW-6 fix: show selection briefly before transitioning
    setTimeout(() => {
      setShow(false);
      setTimeout(() => {
        setStep((s) => s + 1);
        setShow(true);
      }, 250);
    }, 400);
  };

  const submitFree = async () => {
    const feedbackData = {
      ...ratings,
      ...(freeText.trim() ? { free: freeText } : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData),
      });
    } catch {
      // Silently fail - feedback is non-critical
    }

    setDone(true);
  };

  // Completion screen
  if (done) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 font-sans relative overflow-hidden pt-[env(safe-area-inset-top,40px)] pb-[env(safe-area-inset-bottom,40px)]">
        <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
        <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

        <div className="relative z-[1] text-center w-full animate-fade-in">
          <div className="text-[56px] mb-5">🙏</div>
          <h2 className="font-serif text-2xl text-brown font-semibold mb-2.5 leading-snug">
            소중한 피드백<br />감사합니다
          </h2>
          <p className="text-sm text-brown-light leading-relaxed font-light mb-10 break-keep">
            어머니의 목소리가<br />마마스테일을 더 따뜻한 공간으로<br />만들어 줍니다
          </p>

          <button
            onClick={onRestart}
            className="w-full py-4 rounded-full bg-transparent text-brown-pale text-sm font-sans font-normal cursor-pointer mt-2"
            style={{ border: "1.5px solid rgba(196,149,106,0.3)" }}
          >
            처음부터 다시 체험하기
          </button>
        </div>
      </div>
    );
  }

  const q = questions[step];
  const isFree = q?.key === "free";

  return (
    <div className="min-h-dvh bg-cream flex flex-col font-sans pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* Progress */}
      <div className="pt-5 px-6 text-center">
        <div className="text-[10px] text-brown-mid tracking-[3px] font-medium mb-3">
          FEEDBACK · {step + 1}/{questions.length}
        </div>
        <div className="flex gap-1 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className="h-[3px] rounded-sm transition-all duration-[400ms]"
              style={{
                width: i <= step ? 24 : 14,
                background:
                  i < step ? "rgba(224,122,95,0.53)" : i === step ? "#E07A5F" : "rgba(0,0,0,0.06)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-7 transition-all duration-[250ms]"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "none" : "translateY(8px)",
        }}
      >
        <div className="text-center w-full">
          <div className="text-[15px] font-semibold text-brown font-serif mb-2.5">
            {q.label}
          </div>
          <div className="text-[13px] text-brown-light font-light mb-9 leading-relaxed">
            {q.sub}
          </div>

          {!isFree ? (
            <div className="flex gap-1.5 justify-center">
              {faces.map((f, i) => (
                <button
                  key={i}
                  onClick={() => rate(q.key, i + 1)}
                  className="flex flex-col items-center gap-1.5 py-3.5 px-1.5 rounded-2xl cursor-pointer min-w-[56px] transition-all active:scale-[0.92]"
                  style={{
                    border:
                      ratings[q.key] === i + 1
                        ? "2px solid #E07A5F"
                        : "1px solid rgba(0,0,0,0.06)",
                    background:
                      ratings[q.key] === i + 1 ? "rgba(224,122,95,0.03)" : "rgba(255,255,255,0.6)",
                  }}
                >
                  <span className="text-[30px]">{f.em}</span>
                  <span className="text-[10px] text-brown-light font-light">{f.lb}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="편하게 이야기해 주세요..."
                className="w-full min-h-[120px] resize-none rounded-[18px] p-4 text-base font-sans font-light leading-relaxed outline-none text-gray-700"
                style={{
                  border: "1.5px solid rgba(196,149,106,0.2)",
                  background: "rgba(255,255,255,0.5)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(224,122,95,0.33)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(196,149,106,0.2)")}
              />
              <button
                onClick={submitFree}
                className="w-full py-4 rounded-full text-white text-[15px] font-sans font-medium cursor-pointer mt-4 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                  boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
                }}
              >
                피드백 제출하기
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-7 pb-7 text-center">
        <button
          onClick={() => setDone(true)}
          className="bg-transparent border-none text-[13px] text-brown-pale cursor-pointer font-sans py-2.5 px-4"
        >
          피드백 건너뛰기
        </button>
      </div>
    </div>
  );
}
