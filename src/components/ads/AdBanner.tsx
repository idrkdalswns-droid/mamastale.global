"use client";

import { useEffect } from "react";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical";
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

export function AdBanner({ slot, format = "auto" }: AdBannerProps) {
  const adClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!adClientId) return;

    try {
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch {
      // AdSense not loaded yet
    }
  }, [adClientId]);

  // Don't render if AdSense not configured
  if (!adClientId) {
    return (
      <div className="my-6 py-8 rounded-xl bg-white/30 border border-dashed border-brown-pale/20 text-center">
        <p className="text-[10px] text-brown-pale tracking-wider">AD SPACE</p>
      </div>
    );
  }

  return (
    <div className="my-6">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
