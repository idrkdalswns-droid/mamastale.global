import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-cream px-6 py-10">
      <div className="max-w-prose mx-auto">
        <Link href="/" className="font-serif text-lg font-bold text-brown no-underline">
          mamastale
        </Link>

        <h1 className="font-serif text-2xl text-brown font-bold mt-8 mb-6">개인정보처리방침</h1>

        <div className="prose prose-sm text-brown-light font-sans font-light leading-relaxed space-y-6">
          <p>마마스테일(이하 &quot;서비스&quot;)은 이용자의 개인정보를 소중히 여기며, 관련 법령을 준수합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">1. 수집하는 개인정보</h2>
          <p>회원가입 시: 이메일, 이름(별명), 비밀번호<br/>
          서비스 이용 시: 대화 내용, 생성된 동화, 피드백 응답<br/>
          자동 수집: 접속 로그, 기기 정보, 쿠키</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">2. 개인정보 이용 목적</h2>
          <p>서비스 제공 및 개선, 맞춤형 치유 경험 제공, 결제 처리, 고객 지원</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">3. 개인정보 보유 기간</h2>
          <p>회원 탈퇴 시 즉시 삭제 (법령에 따른 보존 기간 제외)</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">4. 개인정보 제3자 제공</h2>
          <p>원칙적으로 제공하지 않으며, 결제 처리를 위해 Stripe에 최소한의 정보만 전달됩니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">5. 쿠키 및 광고</h2>
          <p>서비스는 Google AdSense를 통해 광고를 게재할 수 있으며, 이를 위해 쿠키가 사용됩니다. 브라우저 설정에서 쿠키를 거부할 수 있습니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">6. 이용자의 권리</h2>
          <p>개인정보 열람, 수정, 삭제를 요청할 수 있습니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">7. 안전성 확보 조치</h2>
          <p>대화 내용은 암호화되어 저장되며, API 키는 서버 측에서만 관리합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">8. 문의</h2>
          <p>개인정보 관련 문의: hello@mamastale.com</p>

          <p className="text-[11px] text-brown-pale mt-8">시행일: 2026년 2월 28일</p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-brown-mid no-underline">← 홈으로</Link>
        </div>
      </div>
    </div>
  );
}
