"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// GR-4/GR-5: Only load GA/AdSense after user explicitly accepts cookies
export function ConsentGatedScripts() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      setConsented(localStorage.getItem("mamastale-cookie-consent") === "accepted");
    };
    check();

    // Listen for consent changes from CookieConsent component
    window.addEventListener("cookie-consent-changed", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("cookie-consent-changed", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  if (!consented) return null;

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const rawAdsenseId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  // KR-16: Validate AdSense client ID format before injecting into script URL
  const adsenseId = rawAdsenseId && /^ca-pub-\d+$/.test(rawAdsenseId) ? rawAdsenseId : null;

  return (
    <>
      {adsenseId && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
      {gaId && /^G-[A-Z0-9]+$/.test(gaId) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
    </>
  );
}
