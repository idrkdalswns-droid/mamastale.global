import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "개발 요청 보드 - mamastale",
  description: "엄마들의 목소리로 만들어가는 서비스. 기능 요청과 개발 현황을 확인하세요.",
  alternates: { canonical: "https://mamastale-global.pages.dev/feature-requests" },
  openGraph: {
    title: "개발 요청 보드 - mamastale",
    description: "엄마들의 목소리로 만들어가는 서비스입니다.",
  },
};
export default function FeatureRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
