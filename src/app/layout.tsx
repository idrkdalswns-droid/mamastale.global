import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { CookieConsent } from "@/components/layout/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mamastale-global.pages.dev"),
  title: "mamastale — 엄마의 삶이 아이의 동화가 되다",
  description:
    "엄마의 삶이 아이를 위한 세상에 하나뿐인 동화가 됩니다. 따뜻한 대화를 나누며 아이에게 들려줄 나만의 동화를 만들어 보세요.",
  keywords: [
    "마마스테일",
    "엄마엄마동화",
    "산후우울증",
    "양육 번아웃",
    "치유 동화",
    "내러티브 테라피",
    "치유 상담",
  ],
  openGraph: {
    title: "mamastale — 엄마의 삶이 아이의 동화가 되다",
    description:
      "엄마의 삶이 아이를 위한 세상에 하나뿐인 동화가 됩니다. 따뜻한 대화를 나누며 아이에게 들려줄 나만의 동화를 만들어 보세요.",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/images/hero.jpg",
        width: 600,
        height: 1067,
        alt: "엄마와 아이가 함께 동화책을 읽는 수채화 일러스트",
      },
    ],
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
    <html lang="ko" style={{ colorScheme: "light" }}>
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID &&
          /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) && (
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
