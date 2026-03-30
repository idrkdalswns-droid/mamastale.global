"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * S1: GA4 Funnel Analytics 재활성화.
 * 쿠키 동의 후에만 GA4 스크립트를 로드합니다.
 */
export function ConsentGatedScripts() {
  const [consented, setConsented] = useState(false);
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    try {
      const consent = localStorage.getItem("mamastale-cookie-consent");
      if (consent === "accepted") setConsented(true);
    } catch {
      // localStorage unavailable
    }

    // Listen for consent changes
    const handler = () => {
      try {
        if (localStorage.getItem("mamastale-cookie-consent") === "accepted") {
          setConsented(true);
        }
      } catch {}
    };
    window.addEventListener("storage", handler);
    // Also listen for custom consent event
    window.addEventListener("cookie-consent-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("cookie-consent-changed", handler);
    };
  }, []);

  // Skip analytics on auth callback to prevent interference with token parsing
  if (!consented || !gaId || pathname === "/auth/callback") return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-in-document */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              cookie_flags: 'SameSite=Lax;Secure',
            });
          `,
        }}
      />
    </>
  );
}
