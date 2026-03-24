"use client";

/**
 * 오프라인 클래스 CTA — 완성 동화 마지막 페이지 이후 표시
 * 4주 커리큘럼 소개 + 카카오톡/이메일 문의로 오프라인 클래스 유입 유도
 */
export function OfflineClassCTA() {
  const curriculum = [
    { week: "1주", icon: "📖", title: "동화 스토리 완성", desc: "mamastale AI 대화로 나만의 동화 제작" },
    { week: "2주", icon: "🎨", title: "삽화 제작", desc: "AI 이미지 생성으로 원하는 그림체 구현" },
    { week: "3주", icon: "🎙️", title: "내레이션 녹음", desc: "엄마 목소리로 동화에 생명 불어넣기" },
    { week: "4주", icon: "🎬", title: "영상 동화 완성", desc: "삽화 + 텍스트 + 내레이션 → 영상 렌더링" },
  ];

  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <p className="text-[11px] text-brown-pale/60 mb-2 tracking-widest">── ✦ ──</p>
      <h3 className="font-serif text-[17px] text-brown font-semibold mb-1">
        이 동화가 마음에 드셨나요?
      </h3>
      <p className="text-[13px] text-brown-light font-light leading-relaxed mb-5 max-w-[300px]">
        스토리부터 그림, 목소리까지 —
        <br />
        <strong className="font-medium text-brown">세상에 하나뿐인 우리 아이 맞춤 영상 동화</strong>를
        <br />
        직접 만들어보세요.
      </p>

      {/* 4주 커리큘럼 */}
      <div className="w-full max-w-[300px] mb-6 space-y-2">
        {curriculum.map((item) => (
          <div
            key={item.week}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(196,149,106,0.1)" }}
          >
            <span className="text-[18px] shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-brown">
                <span className="text-brown-pale font-light">{item.week}</span> {item.title}
              </p>
              <p className="text-[10px] text-brown-light font-light">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-brown-light font-light mb-5">
        4주 프로그램 · 소규모 클래스 · AI 도구 실습
      </p>

      {/* CTA 버튼 */}
      <div className="space-y-3 w-full max-w-[300px]">
        <a
          href="https://open.kakao.com/o/gSSkFmii"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[14px] font-medium no-underline transition-all active:scale-[0.97] min-h-[48px]"
          style={{ background: "#FEE500", color: "#3C1E1E" }}
        >
          💬 카카오톡 문의
        </a>

        <a
          href="mailto:idrkdalswns@gmail.com?subject=오프라인 동화 클래스 문의"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[14px] font-medium no-underline transition-all active:scale-[0.97] min-h-[48px]"
          style={{
            background: "transparent",
            color: "rgb(var(--brown))",
            border: "1.5px solid rgba(196,149,106,0.3)",
          }}
        >
          📧 이메일 문의
        </a>
      </div>

      <p className="text-[10px] text-brown-pale/50 mt-6">
        mamastale 오프라인 클래스
      </p>
    </div>
  );
}
