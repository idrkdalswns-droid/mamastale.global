import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-cream px-6 py-10">
      <div className="max-w-prose mx-auto">
        <Link href="/" className="font-serif text-lg font-bold text-brown no-underline">
          mamastale
        </Link>

        <h1 className="font-serif text-2xl text-brown font-bold mt-8 mb-6">이용약관</h1>

        <div className="prose prose-sm text-brown-light font-sans font-light leading-relaxed space-y-6">
          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제1조 (목적)</h2>
          <p>본 약관은 마마스테일(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무를 규정합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제2조 (서비스 내용)</h2>
          <p>AI 기반 마음 돌봄 대화 서비스, 10장면 동화 창작, PDF 다운로드, 피드백 제출 등의 기능을 제공합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제3조 (의료 면책)</h2>
          <p>본 서비스는 의료 행위를 대체하지 않습니다. AI 상담은 참고용이며, 전문 의료 상담이 필요한 경우 반드시 전문가의 도움을 받으시기 바랍니다. 긴급 상황 시 자살예방상담전화 1393, 정신건강위기상담 1577-0199로 연락해 주세요.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제4조 (이용 요금)</h2>
          <p>무료 체험: 1회 완전한 동화 창작 가능<br/>
          동화 1권 티켓: ₩2,000 / 1권<br/>
          5권 묶음 패키지: ₩8,000 / 5권 (20% 할인)<br/>
          티켓은 소멸 기한이 없으며, 결제는 Stripe를 통해 처리됩니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제5조 (저작권)</h2>
          <p>이용자가 서비스를 통해 생성한 동화의 저작권은 이용자에게 귀속됩니다. 서비스의 UI, 시스템 프롬프트, 브랜드 자산의 저작권은 마마스테일에 귀속됩니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제6조 (이용 제한)</h2>
          <p>서비스를 악용하거나 타인에게 피해를 주는 행위, 자동화 도구를 이용한 과도한 접근은 제한될 수 있습니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제7조 (면책)</h2>
          <p>AI가 생성한 콘텐츠의 정확성을 보증하지 않으며, 서비스 이용으로 인한 심리적 영향에 대해 제한적 책임만 부담합니다.</p>

          <p className="text-[11px] text-brown-pale mt-8">시행일: 2026년 2월 28일</p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-brown-mid no-underline">← 홈으로</Link>
        </div>
      </div>
    </div>
  );
}
