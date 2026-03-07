import type { Metadata } from "next";

export const metadata: Metadata = { title: "내 서재 - mamastale" };

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
