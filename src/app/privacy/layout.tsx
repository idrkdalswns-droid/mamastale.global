import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "개인정보처리방침 - mamastale",
  description: "mamastale 개인정보처리방침입니다.",
  alternates: { canonical: "https://mamastale-global.pages.dev/privacy" },
  robots: { index: true, follow: true },
};
export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
