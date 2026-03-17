import Link from "next/link";

const KAKAO_CHANNEL_URL = "https://open.kakao.com/o/gSSkFmii";

export function Footer() {
  return (
    <footer className="w-full border-t border-brown-pale/10 mt-12 pt-6 pb-8 px-6">
      <div className="max-w-[430px] mx-auto text-center space-y-3">
        {/* Brand */}
        <p className="font-serif text-sm font-semibold text-brown">
          mamastale
        </p>

        {/* 고객센터 */}
        <div className="flex items-center justify-center gap-3 text-[12px]">
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium no-underline transition-all active:scale-[0.97]"
            style={{ background: "#FEE500", color: "#3C1E1E" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
              <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.65 6.6l-.95 3.53c-.08.3.26.54.52.37l4.2-2.8c.51.06 1.04.1 1.58.1 5.52 0 10-3.58 10-7.9S17.52 3 12 3z" />
            </svg>
            카카오톡 문의
          </a>
          <a
            href="mailto:idrkdalswns@gmail.com"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-brown-light font-medium no-underline border border-brown-pale/20 transition-all active:scale-[0.97]"
          >
            ✉️ 이메일 문의
          </a>
        </div>

        {/* Business info (전자상거래법 필수 표시사항) */}
        <div className="text-[11px] text-brown-pale font-light leading-relaxed space-y-0.5">
          <p>상호명: 엄마엄마동화 | 대표자: 강민준</p>
          <p>사업자등록번호: 409-28-94015</p>
          <p>통신판매업신고번호: 2026-서울강서-0925</p>
          <p>주소: 서울특별시 강서구 초록마을로19길 18, B01호(화곡동, 대한빌라)</p>
          <p>
            대표번호:{" "}
            <a
              href="tel:010-2311-5166"
              className="underline underline-offset-2"
            >
              010-2311-5166
            </a>
            {" "}| 문의:{" "}
            <a
              href="mailto:idrkdalswns@gmail.com"
              className="underline underline-offset-2"
            >
              idrkdalswns@gmail.com
            </a>
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-brown-pale font-light">
          <Link href="/terms" className="underline underline-offset-2 decoration-brown-pale/40 min-h-[44px] inline-flex items-center px-2">
            이용약관
          </Link>
          <span>·</span>
          <Link href="/privacy" className="underline underline-offset-2 decoration-brown-pale/40 min-h-[44px] inline-flex items-center px-2">
            개인정보처리방침
          </Link>
          <span>·</span>
          <Link href="/pricing" className="underline underline-offset-2 decoration-brown-pale/40 min-h-[44px] inline-flex items-center px-2">
            요금안내
          </Link>
        </div>

        <p className="text-[10px] text-brown-pale/60 font-light">
          &copy; {new Date().getFullYear()} mamastale. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
