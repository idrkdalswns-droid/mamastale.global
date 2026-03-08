import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-brown-pale/10 mt-12 pt-6 pb-8 px-6">
      <div className="max-w-[430px] mx-auto text-center space-y-3">
        {/* Brand */}
        <p className="font-serif text-sm font-semibold text-brown">
          mamastale
        </p>

        {/* Business info (전자상거래법 필수 표시사항) */}
        <div className="text-[10px] text-brown-pale font-light leading-relaxed space-y-0.5">
          <p>상호명: 엄마엄마동화 | 대표: 강민준</p>
          <p>사업자등록번호: 409-28-94015</p>
          <p>주소: 서울특별시 강서구 초록마을로19길 18, B01호</p>
          <p>
            문의:{" "}
            <a
              href="mailto:kang.minjune@icloud.com"
              className="underline underline-offset-2"
            >
              kang.minjune@icloud.com
            </a>
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-brown-pale font-light">
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

        <p className="text-[9px] text-brown-pale/60 font-light">
          &copy; {new Date().getFullYear()} mamastale. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
