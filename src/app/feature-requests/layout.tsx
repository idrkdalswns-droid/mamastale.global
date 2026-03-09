import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "개발 요청 보드 - mamastale",
  description: "엄마들의 목소리로 만들어가는 서비스. 기능 요청과 개발 현황을 확인하세요.",
  alternates: { canonical: "https://mamastale-global.pages.dev/feature-requests" },
  openGraph: {
    title: "개발 요청 보드 - mamastale",
    description: "엄마들의 목소리로 만들어가는 서비스입니다.",
    type: "website",
    images: [{ url: "https://mamastale-global.pages.dev/images/hero.jpg", width: 1200, height: 630, alt: "mamastale 개발 요청 보드" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "개발 요청 보드 - mamastale",
    description: "엄마들의 목소리로 만들어가는 서비스입니다.",
    images: ["https://mamastale-global.pages.dev/images/hero.jpg"],
  },
};
export default function FeatureRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
