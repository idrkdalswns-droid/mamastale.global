import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "커뮤니티 | mamastale",
  description: "엄마들이 만든 동화를 공유하고 감상하는 mamastale 커뮤니티.",
  alternates: { canonical: "https://mamastale-global.pages.dev/community" },
  openGraph: {
    title: "커뮤니티 - mamastale",
    description: "엄마들이 만든 동화를 감상하고 이야기를 나누세요.",
    type: "website",
    images: [{ url: "https://mamastale-global.pages.dev/images/hero.jpg", width: 1200, height: 630, alt: "mamastale 커뮤니티" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "커뮤니티 - mamastale",
    description: "엄마들이 만든 동화를 감상하고 이야기를 나누세요.",
    images: ["https://mamastale-global.pages.dev/images/hero.jpg"],
  },
};
export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
