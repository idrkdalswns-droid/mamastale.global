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
          <p>마마스테일(이하 &quot;서비스&quot;)은 이용자의 개인정보를 소중히 여기며, 대한민국 개인정보보호법 및 EU 일반개인정보보호규정(GDPR)을 준수합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">1. 수집하는 개인정보</h2>
          <p>회원가입 시: 이메일, 이름(별명), 비밀번호<br/>
          서비스 이용 시: 대화 내용, 생성된 동화, 피드백 응답<br/>
          자동 수집: 접속 로그, 기기 정보, 쿠키 (동의 시에만)</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">2. 개인정보 처리의 법적 근거 (GDPR Art. 6)</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>계약 이행</strong>: 동화 생성 서비스 제공을 위한 계정 정보 및 대화 내용 처리</li>
            <li><strong>동의</strong>: 쿠키 및 분석 도구 사용, 마케팅 커뮤니케이션</li>
            <li><strong>정당한 이익</strong>: 서비스 보안 및 부정 사용 방지</li>
          </ul>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">3. 개인정보 이용 목적</h2>
          <p>서비스 제공 및 개선, 맞춤형 치유 경험 제공, 결제 처리, 고객 지원</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">4. AI 데이터 처리 안내</h2>
          <p>본 서비스는 동화 생성을 위해 이용자의 대화 내용을 <strong>Anthropic (Claude API)</strong>에 전송합니다. 이는 서비스의 핵심 기능을 제공하기 위해 필수적이며, 회원가입 시 이에 대한 동의를 받고 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>전송 데이터: 대화 메시지, 맥락 정보 (아이 이름/나이 등 사용자가 입력한 정보)</li>
            <li>Anthropic의 API 이용 약관에 따라, API를 통해 전송된 데이터는 모델 훈련에 사용되지 않습니다</li>
            <li>데이터는 미국 소재 서버에서 처리됩니다 (국외 이전)</li>
          </ul>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">5. 개인정보 처리 위탁 및 제3자 제공</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-brown-pale/20">
                <th className="text-left py-2 font-medium">수탁업체</th>
                <th className="text-left py-2 font-medium">목적</th>
                <th className="text-left py-2 font-medium">소재지</th>
              </tr>
            </thead>
            <tbody className="text-brown-light">
              <tr className="border-b border-brown-pale/10">
                <td className="py-2">Anthropic</td>
                <td className="py-2">AI 동화 생성 (Claude API)</td>
                <td className="py-2">미국</td>
              </tr>
              <tr className="border-b border-brown-pale/10">
                <td className="py-2">Supabase</td>
                <td className="py-2">데이터베이스 및 인증</td>
                <td className="py-2">미국/EU</td>
              </tr>
              <tr className="border-b border-brown-pale/10">
                <td className="py-2">Stripe</td>
                <td className="py-2">결제 처리</td>
                <td className="py-2">미국</td>
              </tr>
              <tr className="border-b border-brown-pale/10">
                <td className="py-2">Google</td>
                <td className="py-2">웹 분석 및 광고 (동의 시에만)</td>
                <td className="py-2">미국</td>
              </tr>
              <tr className="border-b border-brown-pale/10">
                <td className="py-2">Cloudflare</td>
                <td className="py-2">CDN 및 보안</td>
                <td className="py-2">글로벌</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs">미국으로의 데이터 이전은 각 업체의 표준계약조항(SCC) 또는 동등한 보호 조치에 근거합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">6. 개인정보 보유 기간</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>계정 정보</strong>: 회원 탈퇴 시 즉시 삭제</li>
            <li><strong>동화 및 대화 내용</strong>: 회원 탈퇴 시 즉시 삭제</li>
            <li><strong>결제 기록</strong>: 관련 법령에 따라 5년 보관 후 삭제</li>
            <li><strong>접속 로그</strong>: 3개월 보관 후 자동 삭제</li>
            <li><strong>쿠키 동의 기록</strong>: 동의 철회 시 즉시 삭제</li>
          </ul>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">7. 쿠키 및 광고</h2>
          <p>서비스는 Google Analytics 및 Google AdSense를 통해 분석 및 광고를 제공할 수 있습니다. 이러한 스크립트는 이용자가 쿠키 사용에 동의한 경우에만 로드됩니다. 쿠키 배너에서 거부를 선택하면 분석/광고 쿠키는 설정되지 않습니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">8. 이용자의 권리</h2>
          <p>이용자는 다음 권리를 행사할 수 있습니다:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>열람권 (GDPR Art. 15)</strong>: 본인의 개인정보 처리 내역 확인</li>
            <li><strong>정정권 (GDPR Art. 16)</strong>: 부정확한 정보의 수정 요청</li>
            <li><strong>삭제권 (GDPR Art. 17)</strong>: 계정 및 모든 데이터 삭제 요청 — 설정 페이지에서 직접 실행 가능</li>
            <li><strong>이동권 (GDPR Art. 20)</strong>: 본인 데이터를 기계 판독 가능한 형식(JSON)으로 내보내기 — 설정 페이지에서 직접 실행 가능</li>
            <li><strong>처리 제한권 (GDPR Art. 18)</strong>: 특정 조건 하에서 처리 제한 요청</li>
            <li><strong>동의 철회권</strong>: 언제든지 쿠키 동의를 철회할 수 있습니다</li>
          </ul>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">9. 안전성 확보 조치</h2>
          <p>대화 내용은 암호화되어 저장되며, API 키는 서버 측에서만 관리합니다. 인증에는 PKCE 흐름을 사용하며, 모든 데이터 전송은 TLS로 암호화됩니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">10. 개인정보 보호 책임자</h2>
          <p>개인정보 관련 문의 및 권리 행사: <strong>hello@mamastale.com</strong></p>

          <p className="text-[11px] text-brown-pale mt-8">시행일: 2026년 3월 2일 (최종 개정)</p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-brown-mid no-underline">&larr; 홈으로</Link>
        </div>
      </div>
    </div>
  );
}
