"use client";

import { useState, useEffect } from "react";

/**
 * SW Update Banner
 *
 * Shows "새 버전이 있습니다" banner when a new service worker is detected.
 * Since skipWaiting is false, the new SW waits until all tabs close.
 * Clicking "새로고침" calls skipWaiting on the waiting SW and reloads.
 */
export function SWUpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingSW(registration.waiting);
          setShowBanner(true);
        }

        // Listen for new workers entering waiting state
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // New SW installed but waiting (skipWaiting: false)
              setWaitingSW(installing);
              setShowBanner(true);
            }
          });
        });
      } catch {
        // SW not supported or error
      }
    };

    checkForUpdate();

    // Listen for controller change (another tab activated the new SW)
    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingSW) {
      waitingSW.postMessage({ type: "SKIP_WAITING" });
    }
    // controllerchange listener will trigger reload
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center px-4 py-2 text-sm animate-in slide-in-from-top-2 duration-300"
      style={{
        background: "linear-gradient(135deg, #7FBFB0, #5FA898)",
        color: "white",
      }}
      role="alert"
    >
      <span className="mr-3">새 버전이 있습니다</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors"
      >
        새로고침
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="ml-2 text-white/60 hover:text-white text-lg leading-none"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
