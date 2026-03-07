import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "요금 안내 - mamastale",
  description: "동화 1편 4,900원. 엄마의 이야기가 세상에 하나뿐인 아이의 동화가 됩니다. 번들 구매 시 더 합리적인 가격으로 만나보세요.",
  openGraph: {
    title: "요금 안내 - mamastale",
    description: "동화 1편 4,900원부터. 엄마의 이야기로 아이만의 동화를 만드세요.",
  },
};
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
