import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-cream px-6 pt-10 pb-20">
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
          <p>동화 스토리 하나 완성 티켓: ₩4,900 / 1권 (첫 구매 시 ₩3,920)<br/>
          동화 네 스토리 완성 티켓: ₩14,900 / 4권 (24% 할인, 1권당 ₩3,725)<br/>
          티켓은 구매일로부터 30일 이내에 사용해야 하며, 결제는 토스페이먼츠를 통해 처리됩니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제5조 (저작권)</h2>
          <p>이용자가 서비스를 통해 생성한 동화의 저작권은 이용자에게 귀속됩니다. 서비스의 UI, 시스템 프롬프트, 브랜드 자산의 저작권은 마마스테일에 귀속됩니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제6조 (이용 제한)</h2>
          <p>서비스를 악용하거나 타인에게 피해를 주는 행위, 자동화 도구를 이용한 과도한 접근은 제한될 수 있습니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제7조 (면책)</h2>
          <p>AI가 생성한 콘텐츠의 정확성을 보증하지 않으며, 서비스 이용으로 인한 심리적 영향에 대해 제한적 책임만 부담합니다.</p>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제8조 (AI 대화 데이터 처리 방침)</h2>
          <p>본 서비스는 이용자와의 대화를 처리하기 위해 제3자 AI 모델(Anthropic Claude)을 활용합니다.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>대화 내용은 동화 생성이라는 서비스 제공 목적으로만 사용됩니다.</li>
            <li>대화 데이터는 Anthropic의 서버에서 처리되며, Anthropic의 데이터 처리 방침에 따릅니다.</li>
            <li>완성된 동화 및 대화 기록은 이용자의 계정에 저장되며, 이용자가 직접 삭제를 요청할 수 있습니다.</li>
            <li>대화 내용 삭제를 원하시는 경우 idrkdalswns@gmail.com으로 문의해 주세요.</li>
          </ul>

          <h2 className="font-serif text-lg font-semibold text-brown mt-8">제9조 (환불 정책)</h2>
          <p>모든 티켓 구매는 최종 확정이며 환불이 불가합니다. 구매 전 신중하게 결정해 주세요.</p>

          <p className="text-[11px] text-brown-pale mt-8">시행일: 2026년 3월 3일</p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-brown-mid no-underline">← 홈으로</Link>
        </div>
      </div>
    </div>
  );
}
