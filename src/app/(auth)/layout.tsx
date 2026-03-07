import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 - mamastale",
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
