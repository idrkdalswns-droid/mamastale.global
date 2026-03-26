import type { Metadata, Viewport } from "next";
import { Nanum_Myeongjo, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ConsentGatedScripts } from "@/components/layout/ConsentGatedScripts";
import { Footer } from "@/components/layout/Footer";
import { GlobalNav } from "@/components/layout/GlobalNav";
import { ErrorReporter } from "@/components/ui/ErrorReporter";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import "./globals.css";

// A1: Self-hosted fonts via next/font (빌드 시 다운로드, 런타임 CDN 의존 제거)
const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum",
  display: "swap",
});
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-noto-sans",
  display: "swap",
});
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mamastale-global.pages.dev"),
  title: "mamastale — AI로 만드는 나만의 동화 | 엄마의 이야기가 아이의 동화가 되다",
  description:
    "엄마의 이야기를 AI와 15분 대화하며 세상에 하나뿐인 동화로 만들어 보세요. 산후우울증, 양육 번아웃을 아이에게 들려줄 아름다운 이야기로 바꿔드립니다.",
  keywords: [
    "AI 동화",
    "AI 동화 만들기",
    "아이 동화 만들기",
    "엄마 동화",
    "마마스테일",
    "엄마엄마동화",
    "산후우울증",
    "양육 번아웃",
    "마음 동화",
    "내러티브 테라피",
    "마음 상담",
  ],
  openGraph: {
    title: "mamastale — AI로 만드는 나만의 동화 | 엄마의 이야기가 아이의 동화가 되다",
    description:
      "엄마의 이야기를 AI와 15분 대화하며 세상에 하나뿐인 동화로 만들어 보세요. 산후우울증, 양육 번아웃을 아이에게 들려줄 아름다운 이야기로 바꿔드립니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "mamastale",
    images: [
      {
        url: "https://mamastale-global.pages.dev/images/hero.jpg",
        width: 1200,
        height: 630,
        alt: "mamastale - 엄마의 삶이 아이의 동화가 되다",
      },
    ],
  },
  alternates: {
    canonical: "https://mamastale-global.pages.dev/",
  },
  twitter: {
    card: "summary_large_image",
    title: "mamastale — AI로 만드는 나만의 동화",
    description: "엄마의 이야기를 AI와 15분 대화하며 세상에 하나뿐인 동화로 만들어 보세요.",
    images: ["https://mamastale-global.pages.dev/images/hero.jpg"],
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

// LOW-9 fix: Add viewport-fit=cover for safe-area-inset support
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${nanumMyeongjo.variable} ${notoSansKr.variable} ${notoSerifKr.variable}`}>
      <head>
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "mamastale",
              "alternateName": "엄마엄마동화",
              "url": "https://mamastale-global.pages.dev",
              "description": "엄마의 이야기를 AI와 15분 대화하며 세상에 하나뿐인 동화로 만들어 보세요. 산후우울증, 양육 번아웃을 아이에게 들려줄 아름다운 이야기로 바꿔드립니다.",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "Web",
              "inLanguage": "ko",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "KRW",
                "description": "무료 체험 후 동화 1편 4,900원",
                "availability": "https://schema.org/InStock",
                "url": "https://mamastale-global.pages.dev/pricing"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "50",
                "bestRating": "5",
                "worstRating": "1"
              }
            }),
          }}
        />
        {/* A1: Google Fonts preconnect 제거 — next/font가 빌드 시 셀프호스팅 */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
      </head>
      <body className="bg-cream antialiased">
        <MotionProvider>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded-lg focus:text-sm">
          본문으로 건너뛰기
        </a>
        <PullToRefresh />
        <main id="main-content" className="max-w-[430px] mx-auto min-h-dvh relative overflow-x-hidden">
          <ScrollToTop />
          <GlobalNav />
          <ErrorBoundary>{children}</ErrorBoundary>
          <Footer />
        </main>
        <ConsentGatedScripts />
        <CookieConsent />
        <ErrorReporter />
        <PWAInstallBanner />
        <Toaster
          position="top-center"
          containerStyle={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          toastOptions={{
            style: {
              fontFamily: "var(--font-noto-sans), sans-serif",
              fontSize: "14px",
              borderRadius: "16px",
            },
          }}
        />
        </MotionProvider>
        {/* A2: CF Web Analytics — 페이지뷰 전용, 쿠키 없음, GDPR 친화 */}
        {process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token":"${process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
