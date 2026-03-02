import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ConsentGatedScripts } from "@/components/layout/ConsentGatedScripts";
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Non-blocking Google Fonts with preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&family=Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@300;400;500;600&display=swap"
        />
        {/* FR-010: Prevent dark mode flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("mamastale_theme");var d=t==="dark"||(t==null&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        {/* GR-4/GR-5: GA/AdSense moved to ConsentGatedScripts — loaded only after cookie consent */}
      </head>
      <body className="bg-cream antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded-lg focus:text-sm">
          본문으로 건너뛰기
        </a>
        <main id="main-content" className="max-w-[430px] mx-auto min-h-dvh relative overflow-x-hidden">
          {children}
        </main>
        <ConsentGatedScripts />
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
