import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금 안내 - mamastale",
  description: "동화 1편 4,900원. 엄마의 이야기가 세상에 하나뿐인 아이의 동화가 됩니다. 번들 구매 시 더 합리적인 가격으로 만나보세요.",
  alternates: { canonical: "https://mamastale-global.pages.dev/pricing" },
  openGraph: {
    title: "요금 안내 - mamastale",
    description: "동화 1편 4,900원부터. 엄마의 이야기로 아이만의 동화를 만드세요.",
  },
};

// FAQPage + Product structured data for rich results
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "티켓은 어떻게 사용하나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "티켓 1장으로 4단계 마음 대화를 진행하고, 10장면 동화 1편을 완성할 수 있어요. 동화 완성 시 티켓이 차감됩니다.",
          },
        },
        {
          "@type": "Question",
          "name": "만든 동화는 영구 보관되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "네, 완성된 동화는 '내 서재'에 영구 보관됩니다. 언제든 PDF로 다운로드하거나 공유할 수 있어요.",
          },
        },
        {
          "@type": "Question",
          "name": "환불은 가능한가요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "모든 티켓 구매는 최종 확정이며, 환불이 불가합니다. 신중하게 결정해 주세요.",
          },
        },
        {
          "@type": "Question",
          "name": "카카오페이, 네이버페이로 결제 가능한가요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "네! 카드 결제는 물론, 카카오페이, 네이버페이, 토스페이 등 다양한 결제 수단을 지원합니다.",
          },
        },
      ],
    },
    {
      "@type": "Product",
      "name": "mamastale 동화 제작 티켓",
      "description": "엄마의 이야기가 AI 대화를 통해 10장면 동화가 됩니다.",
      "brand": { "@type": "Brand", "name": "mamastale" },
      "offers": [
        {
          "@type": "Offer",
          "name": "단건 티켓 1장",
          "price": "4900",
          "priceCurrency": "KRW",
          "availability": "https://schema.org/InStock",
          "url": "https://mamastale-global.pages.dev/pricing",
        },
        {
          "@type": "Offer",
          "name": "4일 프로그램 번들 (4장)",
          "price": "14900",
          "priceCurrency": "KRW",
          "availability": "https://schema.org/InStock",
          "url": "https://mamastale-global.pages.dev/pricing",
        },
      ],
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  );
}
