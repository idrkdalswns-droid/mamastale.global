import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "이용 후기 - mamastale",
  description: "mamastale로 동화를 만든 엄마들의 진솔한 이야기. 아이와 함께한 특별한 경험을 확인하세요.",
  openGraph: {
    title: "이용 후기 - mamastale",
    description: "mamastale 엄마들의 진솔한 후기를 확인하세요.",
  },
};
export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
