import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마마스테일이란 - mamastale",
  description:
    "마마스테일의 4단계 AI 대화 엔진을 소개합니다. 펜네베이커 표현적 글쓰기, 소크라틱 질문법, 내러티브 테라피, 치유적 서사 구조에 기반하여 엄마의 이야기를 아이의 동화로 변환합니다.",
  alternates: { canonical: "https://mamastale-global.pages.dev/about" },
  openGraph: {
    title: "마마스테일이란 - mamastale",
    description:
      "엄마의 이야기가 아이의 동화가 되는 4단계 AI 대화 엔진을 소개합니다.",
    type: "website",
    images: [{ url: "https://mamastale-global.pages.dev/images/hero.jpg", width: 1200, height: 630, alt: "mamastale 소개" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "마마스테일이란 - mamastale",
    description: "엄마의 이야기가 아이의 동화가 되는 4단계 AI 대화 엔진을 소개합니다.",
    images: ["https://mamastale-global.pages.dev/images/hero.jpg"],
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
