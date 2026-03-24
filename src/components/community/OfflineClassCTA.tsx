"use client";

/**
 * 오프라인 클래스 소개 — 커뮤니티 "오프라인 클래스" 탭에서 인라인 렌더링
 * 세련된 미니멀 디자인. 이모지 없음. 타겟: 감각적인 젊은 엄마.
 */
export function OfflineClassCTA() {
  const steps = [
    {
      num: "01",
      title: "동화 스토리",
      tool: "mamastale",
      desc: "AI와의 15분 대화로 우리 아이만의 10장면 동화 스토리를 완성합니다.",
    },
    {
      num: "02",
      title: "삽화 제작",
      tool: "Nano Banana Pro",
      desc: "AI 이미지 생성으로 원하는 그림체와 톤으로 장면별 삽화를 만듭니다.",
    },
    {
      num: "03",
      title: "내레이션 녹음",
      tool: "CapCut",
      desc: "엄마의 목소리로 동화를 읽어주고, 삽화 위에 텍스트를 오버레이합니다.",
    },
    {
      num: "04",
      title: "영상 동화 완성",
      tool: "렌더링",
      desc: "삽화, 텍스트, 내레이션을 결합하여 하나의 영상 동화로 완성합니다.",
    },
  ];

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="text-center pt-6 pb-8 px-4">
        <p className="text-[10px] tracking-[0.3em] text-brown-pale/50 uppercase mb-3">
          Offline Class
        </p>
        <h2 className="font-serif text-[22px] text-brown font-semibold leading-tight mb-3">
          스토리부터 영상까지,
          <br />
          4주 만에 완성하는
          <br />
          우리 아이 동화
        </h2>
        <p className="text-[13px] text-brown-light font-light leading-relaxed max-w-[280px] mx-auto">
          AI 도구를 활용해 세상에 하나뿐인
          <br />
          맞춤 영상 동화를 직접 만들어보세요.
        </p>
      </div>

      {/* Divider */}
      <div className="w-8 h-px mx-auto mb-8" style={{ background: "rgba(196,149,106,0.3)" }} />

      {/* 4주 커리큘럼 */}
      <div className="px-5 mb-10 space-y-4 max-w-[340px] mx-auto">
        {steps.map((step, i) => (
          <div key={step.num} className="relative">
            {/* 연결선 */}
            {i < steps.length - 1 && (
              <div className="absolute left-[15px] top-[42px] w-px h-[calc(100%+4px)]" style={{ background: "rgba(196,149,106,0.15)" }} />
            )}
            <div className="flex gap-4">
              {/* 넘버 서클 */}
              <div
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                style={{
                  background: "rgba(196,149,106,0.08)",
                  color: "rgb(var(--brown-light))",
                  border: "1px solid rgba(196,149,106,0.15)",
                }}
              >
                {step.num}
              </div>
              <div className="pt-0.5">
                <p className="text-[14px] font-medium text-brown mb-0.5">
                  {step.title}
                </p>
                <p className="text-[10px] text-brown-pale font-light tracking-wide mb-1">
                  {step.tool}
                </p>
                <p className="text-[12px] text-brown-light font-light leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 요약 */}
      <div className="text-center mb-8 px-4">
        <p className="text-[12px] text-brown-light font-light leading-relaxed">
          4주 프로그램 · 소규모 클래스 · AI 도구 실습
          <br />
          <span className="text-brown font-medium">기술을 배우는 동시에, 동화가 완성됩니다.</span>
        </p>
      </div>

      {/* Divider */}
      <div className="w-8 h-px mx-auto mb-8" style={{ background: "rgba(196,149,106,0.3)" }} />

      {/* CTA */}
      <div className="px-5 max-w-[300px] mx-auto space-y-3">
        <a
          href="https://open.kakao.com/o/gSSkFmii"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full py-3.5 rounded-full text-[14px] font-medium no-underline transition-all active:scale-[0.97] min-h-[48px]"
          style={{ background: "#FEE500", color: "#3C1E1E" }}
        >
          카카오톡 문의
        </a>

        <a
          href="mailto:idrkdalswns@gmail.com?subject=오프라인 동화 클래스 문의"
          className="flex items-center justify-center w-full py-3.5 rounded-full text-[14px] font-medium no-underline transition-all active:scale-[0.97] min-h-[48px]"
          style={{
            background: "transparent",
            color: "rgb(var(--brown))",
            border: "1.5px solid rgba(196,149,106,0.25)",
          }}
        >
          이메일 문의
        </a>
      </div>

      <p className="text-[10px] text-brown-pale/40 text-center mt-8">
        mamastale offline class
      </p>
    </div>
  );
}
