"use client";

/**
 * 오프라인 클래스 CTA — 완성 동화 마지막 페이지 이후 표시
 * 카카오톡/이메일 문의 버튼으로 오프라인 클래스 유입 유도
 */
export function OfflineClassCTA() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-10 text-center">
      <p className="text-[11px] text-brown-pale/60 mb-2 tracking-widest">── ✨ ──</p>
      <h3 className="font-serif text-lg text-brown font-semibold mb-2">
        이 동화가 마음에 드셨나요?
      </h3>
      <p className="text-[13px] text-brown-light font-light leading-relaxed mb-6 max-w-[280px]">
        우리 아이만의 동화를 직접 만들어보세요.
        <br />
        8주 프로그램으로 삽화부터 영상까지 완성합니다.
      </p>

      <div className="space-y-3 w-full max-w-[280px]">
        {/* 카카오톡 문의 */}
        <a
          href="https://open.kakao.com/o/sExample"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[14px] font-medium no-underline transition-all active:scale-[0.97] min-h-[48px]"
          style={{
            background: "#FEE500",
            color: "#3C1E1E",
          }}
        >
          💬 카카오톡 문의
        </a>

        {/* 이메일 문의 */}
        <a
          href="mailto:idrkdalswns@gmail.com?subject=오프라인 클래스 문의"
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
