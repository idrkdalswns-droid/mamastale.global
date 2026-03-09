import type { Metadata } from "next";

// Required by Cloudflare Pages for all dynamic routes
export const runtime = "edge";

// R5-FIX: Add metadata for private story detail pages
export const metadata: Metadata = {
  title: "나의 마음 동화 - mamastale",
  description: "엄마의 마음이 담긴 세상에 하나뿐인 마음 동화입니다.",
  robots: { index: false, follow: false },
};

export default function LibraryStoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
