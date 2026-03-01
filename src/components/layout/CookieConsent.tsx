"use client";

import { useState, useEffect } from "react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("mamastale-cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("mamastale-cookie-consent", "accepted");
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("mamastale-cookie-consent", "declined");
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[999] px-4 pb-[calc(env(safe-area-inset-bottom,8px)+8px)] animate-fade-up"
      role="alertdialog"
      aria-label="쿠키 사용 동의"
    >
      <div className="max-w-[430px] mx-auto bg-white/95 backdrop-blur-xl rounded-2xl p-4 border border-brown-pale/10 shadow-lg">
        <p className="text-xs text-brown-light font-light leading-relaxed mb-3">
          마마스테일은 더 나은 경험을 위해 쿠키를 사용합니다.{" "}
          <a href="/privacy" className="text-coral underline">개인정보처리방침</a> 확인
        </p>
        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 py-2.5 rounded-full text-xs text-brown-light font-medium"
            style={{ border: "1px solid rgba(196,149,106,0.2)" }}
          >
            거부
          </button>
          <button
            onClick={accept}
            className="flex-1 py-2.5 rounded-full text-xs text-white font-medium"
            style={{ background: "linear-gradient(135deg, #E07A5F, #D4836B)" }}
          >
            동의
          </button>
        </div>
      </div>
    </div>
  );
}
