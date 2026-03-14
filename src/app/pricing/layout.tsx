import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금 안내 | mamastale",
  description: "mamastale 동화 만들기 요금 안내. 동화 한 편 ₩4,900, 4일 프로그램 ₩14,900.",
  alternates: { canonical: "https://mamastale-global.pages.dev/pricing" },
  openGraph: {
    title: "요금 안내 - mamastale",
    description: "동화 1편 4,900원부터. 엄마의 이야기로 아이만의 동화를 만드세요.",
    type: "website",
    images: [{ url: "https://mamastale-global.pages.dev/images/hero.jpg", width: 1200, height: 630, alt: "mamastale 요금 안내" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "요금 안내 - mamastale",
    description: "동화 1편 4,900원부터. 엄마의 이야기로 아이만의 동화를 만드세요.",
    images: ["https://mamastale-global.pages.dev/images/hero.jpg"],
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
          "name": "어떻게 사용하나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "1회 구매로 4단계 마음 대화를 진행하고, 10장면 동화 1편을 완성할 수 있어요. 동화 완성 시 1회가 차감됩니다.",
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
            "text": "모든 구매는 최종 확정이며, 환불이 불가합니다. 신중하게 결정해 주세요.",
          },
        },
        {
          "@type": "Question",
          "name": "어떤 결제 수단을 지원하나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "토스페이먼츠를 통해 신용카드, 체크카드, 카카오페이, 네이버페이, 토스페이 등 다양한 결제 수단을 지원합니다.",
          },
        },
      ],
    },
    {
      "@type": "Product",
      "name": "mamastale 동화 만들기",
      "description": "엄마의 이야기가 AI 대화를 통해 10장면 동화가 됩니다.",
      "brand": { "@type": "Brand", "name": "mamastale" },
      "offers": [
        {
          "@type": "Offer",
          "name": "동화 한 편 만들기",
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
