import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "입소문 자판기 — mamastale",
  description: "친구에게 알려주면 서로 티켓 1장씩! 추천 코드를 공유하고 무료 동화 티켓을 받으세요.",
};

export default function VendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
