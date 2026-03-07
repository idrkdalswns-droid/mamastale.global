import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "커뮤니티 - mamastale",
  description: "다른 엄마들이 만든 동화를 감상하고, 육아 이야기를 나누는 공간입니다.",
  alternates: { canonical: "https://mamastale-global.pages.dev/community" },
  openGraph: {
    title: "커뮤니티 - mamastale",
    description: "엄마들이 만든 동화를 감상하고 이야기를 나누세요.",
  },
};
export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
