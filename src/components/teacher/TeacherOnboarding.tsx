"use client";

import { useState, useEffect } from "react";
import type { TeacherOnboarding as TeacherOnboardingType } from "@/lib/types/teacher";

interface TeacherOnboardingProps {
  onComplete: (data: TeacherOnboardingType) => void;
}

interface OnboardingStep {
  title: string;
  description: string;
  options: { value: string; label: string; icon: string }[];
  key: keyof TeacherOnboardingType;
  isTextInput?: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    title: "어떤 반 아이들인가요?",
    description: "연령대에 맞는 동화를 만들어요",
    key: "ageGroup",
    options: [
      { value: "infant", label: "영아반 (0-2세)", icon: "👶" },
      { value: "toddler", label: "유아반 (3-4세)", icon: "🧒" },
      { value: "kindergarten", label: "유치반 (5-7세)", icon: "🎒" },
      { value: "mixed", label: "혼합연령", icon: "👫" },
    ],
  },
  {
    title: "어떤 상황에서 활용하실 건가요?",
    description: "맥락에 맞는 이야기를 준비해요",
    key: "context",
    options: [
      { value: "large_group", label: "대집단 활동", icon: "👥" },
      { value: "small_group", label: "소집단 활동", icon: "👤" },
      { value: "free_choice", label: "자유선택 활동", icon: "🎨" },
      { value: "home_connection", label: "가정연계", icon: "🏠" },
    ],
  },
  {
    title: "어떤 주제의 동화가 필요하세요?",
    description: "아이들에게 전하고 싶은 이야기",
    key: "topic",
    options: [
      { value: "양치", label: "양치", icon: "🪥" },
      { value: "편식", label: "편식", icon: "🥦" },
      { value: "화 조절", label: "화 조절", icon: "😤" },
      { value: "분리불안", label: "분리불안", icon: "🥺" },
      { value: "정리정돈", label: "정리정돈", icon: "🧹" },
      { value: "거짓말", label: "거짓말", icon: "🤥" },
      { value: "양보/공유", label: "양보/공유", icon: "🤝" },
      { value: "_custom", label: "직접 입력", icon: "✏️" },
    ],
  },
  {
    title: "주인공은 어떤 캐릭터가 좋을까요?",
    description: "아이들이 좋아할 캐릭터 유형",
    key: "characterType",
    options: [
      { value: "animal", label: "동물 친구", icon: "🐻" },
      { value: "child", label: "사람 아이", icon: "👧" },
      { value: "object", label: "사물 의인화", icon: "🧸" },
      { value: "fantasy", label: "판타지 생물", icon: "🦄" },
      { value: "auto", label: "알아서 해주세요!", icon: "🎲" },
    ],
  },
  {
    title: "혹시 특별한 상황이 있나요?",
    description: "구체적인 상황을 알려주시면 더 맞춤 동화를 만들어요",
    key: "situation",
    isTextInput: true,
    options: [],
  },
];

export function TeacherOnboarding({ onComplete }: TeacherOnboardingProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<TeacherOnboardingType>({});
  const [customTopic, setCustomTopic] = useState("");
  const [situation, setSituation] = useState("");

  const currentStep = STEPS[step];

  // Step 4(situation) 진입 시 data.situation이 있으면 textarea에 복원
  useEffect(() => {
    if (currentStep.isTextInput && currentStep.key === "situation" && data.situation) {
      setSituation(data.situation as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleBack = () => {
    // situation textarea에서 뒤로가기 시 data에 임시 저장
    if (currentStep.isTextInput && currentStep.key === "situation" && situation.trim()) {
      setData((prev) => ({ ...prev, situation: situation.trim() }));
    }
    setStep(step - 1);
  };

  const handleSelect = (value: string) => {
    if (currentStep.key === "topic" && value === "_custom") {
      // 직접 입력 모드 — 별도 처리
      return;
    }

    const newData = { ...data, [currentStep.key]: value };
    setData(newData);

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(newData);
    }
  };

  const handleTextSubmit = () => {
    if (currentStep.key === "situation") {
      const newData = { ...data, situation: situation.trim() || undefined };
      onComplete(newData);
    } else if (currentStep.key === "topic") {
      const newData = { ...data, topic: customTopic.trim() };
      setData(newData);
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  return (
    <div className="flex flex-col min-h-[60dvh] px-4 pt-4">
      {/* 진행 바 */}
      <div className="flex gap-1.5 mb-6">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: idx <= step ? "#E07A5F" : "#E8DDD0",
            }}
          />
        ))}
      </div>

      {/* 제목 */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-brown break-keep">
          {currentStep.title}
        </h2>
        <p className="text-sm text-brown-light mt-1 break-keep">
          {currentStep.description}
        </p>
      </div>

      {/* 선택지 또는 텍스트 입력 */}
      {currentStep.isTextInput ? (
        <div className="space-y-4">
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="예: 00이가 친구를 자꾸 때려요. 친구 사이에 갈등이 많아요."
            maxLength={200}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-brown-pale/30
                       text-sm text-brown placeholder:text-brown-pale/50
                       focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50
                       bg-paper resize-none"
            style={{ fontSize: "16px" }}
          />
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-full text-sm font-medium text-brown-light
                         border border-brown-pale/30 active:scale-[0.97] transition-all"
            >
              건너뛰기
            </button>
            <button
              onClick={handleTextSubmit}
              className="flex-1 py-3 rounded-full text-white text-sm font-medium
                         active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              시작하기 ✨
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {currentStep.options.map((opt) => {
            // 직접 입력 옵션 (주제)
            if (opt.value === "_custom") {
              return (
                <div key={opt.value} className="col-span-2">
                  {customTopic !== null && data.topic === undefined ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="주제를 입력해주세요"
                        maxLength={50}
                        className="flex-1 px-4 py-3 rounded-xl border border-brown-pale/30
                                   text-sm text-brown placeholder:text-brown-pale/50
                                   focus:outline-none focus:ring-2 focus:ring-coral/30
                                   bg-paper"
                        style={{ fontSize: "16px" }}
                      />
                      <button
                        onClick={handleTextSubmit}
                        disabled={!customTopic.trim()}
                        className="px-4 py-3 rounded-xl text-white text-sm font-medium
                                   disabled:opacity-50 active:scale-[0.97] transition-all"
                        style={{
                          background:
                            "linear-gradient(135deg, #E07A5F, #C96B52)",
                        }}
                      >
                        확인
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelect("_custom")}
                      className="w-full py-3 rounded-xl border border-dashed border-brown-pale/40
                                 text-sm text-brown-light font-medium
                                 hover:bg-paper/80 active:scale-[0.98] transition-all"
                    >
                      {opt.icon} {opt.label}
                    </button>
                  )}
                </div>
              );
            }

            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl
                           border border-brown-pale/20 bg-paper/60
                           hover:border-coral/30 hover:bg-paper
                           active:scale-[0.97] transition-all"
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-medium text-brown break-keep text-center">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 뒤로 가기 — 모든 단계에서 표시 */}
      {step > 0 && (
        <button
          onClick={handleBack}
          className="mt-6 text-[12px] text-brown-pale underline underline-offset-2
                     decoration-brown-pale/30 mx-auto"
        >
          이전 단계로
        </button>
      )}
    </div>
  );
}
