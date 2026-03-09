import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "이용약관 - mamastale",
  description: "mamastale 서비스 이용약관입니다.",
  alternates: { canonical: "https://mamastale-global.pages.dev/terms" },
  robots: { index: true, follow: true },
};
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
