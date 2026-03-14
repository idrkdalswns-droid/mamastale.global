import type { Metadata } from "next";

// Required by Cloudflare Pages for all dynamic routes
export const runtime = "edge";

export const metadata: Metadata = {
  title: "무료 DIY 동화 | mamastale",
  description: "무료로 나만의 DIY 동화를 만들어 보세요. 6가지 동화 템플릿 제공.",
};

export default function DIYLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
