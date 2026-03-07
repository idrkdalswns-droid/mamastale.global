import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "내 서재 - mamastale",
  description: "내가 만든 동화를 모아보고 관리하는 공간입니다.",
  robots: { index: false, follow: false },
};
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
