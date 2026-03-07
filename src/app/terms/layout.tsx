import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "이용약관 - mamastale",
  description: "mamastale 서비스 이용약관입니다.",
  robots: { index: true, follow: true },
};
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
