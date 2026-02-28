import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { CookieConsent } from "@/components/layout/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "mamastale — 나의 과거가 아이의 동화가 되다",
  description:
    "AI 상담사와 대화하며 4단계 치유 여정을 체험하고, 아이에게 들려줄 나만의 동화를 만들어 보세요. 엄마의 상처가 세상에 하나뿐인 동화가 됩니다.",
  keywords: [
    "마마스테일",
    "엄마엄마동화",
    "산후우울증",
    "양육 번아웃",
    "치유 동화",
    "AI 상담",
    "내러티브 테라피",
  ],
  openGraph: {
    title: "mamastale — 나의 과거가 아이의 동화가 되다",
    description:
      "AI 상담사와 대화하며 엄마만의 치유 동화를 만들어 보세요.",
    type: "website",
    locale: "ko_KR",
  },
};

// LOW-9 fix: Add viewport-fit=cover for safe-area-inset support
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="bg-cream antialiased">
        <div className="max-w-[430px] mx-auto min-h-dvh relative overflow-hidden">
          {children}
        </div>
        <CookieConsent />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "14px",
              borderRadius: "16px",
            },
          }}
        />
      </body>
    </html>
  );
}
