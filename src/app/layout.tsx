import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ConsentGatedScripts } from "@/components/layout/ConsentGatedScripts";
import { Footer } from "@/components/layout/Footer";
import { GlobalNav } from "@/components/layout/GlobalNav";
import { ErrorReporter } from "@/components/ui/ErrorReporter";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "./globals.css";

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
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "mamastale",
              "url": "https://mamastale-global.pages.dev",
              "description": "엄마의 삶이 아이를 위한 세상에 하나뿐인 동화가 됩니다.",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "4900",
                "priceCurrency": "KRW",
                "description": "동화 한 편 만들기 (10장면)",
                "availability": "https://schema.org/InStock",
                "url": "https://mamastale-global.pages.dev/pricing"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "17",
                "bestRating": "5",
                "worstRating": "1"
              }
            }),
          }}
        />
        {/* Non-blocking Google Fonts with preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* H-2: Preload critical font CSS to avoid render-blocking */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&family=Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@300;400;500;600&display=swap"
        />
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
        <NextIntlClientProvider messages={messages}>
        <MotionProvider>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded-lg focus:text-sm">
          본문으로 건너뛰기
        </a>
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
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "14px",
              borderRadius: "16px",
            },
          }}
        />
        </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
