import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "딸깍 동화 — mamastale",
  description: "스무 개의 질문이 당신만의 동화를 만들어요. 약 10분이면 충분해요.",
};

export default function DalkkakLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
