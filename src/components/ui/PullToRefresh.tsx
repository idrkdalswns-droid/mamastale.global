"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Custom Pull-to-Refresh — works on iOS PWA standalone + all mobile browsers.
 * Activates only when page is scrolled to top. Clears SW cache before reloading.
 *
 * Disabled on screens where accidental refresh would cause data loss:
 * - Chat, onboarding, story editor, cover picker (main service)
 * - Teacher chat, generating (teacher mode)
 */

const THRESHOLD = 60; // px to pull before triggering
const MAX_PULL = 120; // max visual pull distance

/** Routes where pull-to-refresh is always enabled */
const ALWAYS_ENABLED_PATHS = [
  "/community",
  "/library",
  "/pricing",
  "/reviews",
  "/about",
  "/diy",
  "/settings",
  "/terms",
  "/privacy",
  "/feature-requests",
  "/login",
  "/signup",
];

export function PullToRefresh() {
  const pathname = usePathname();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isDisabledRef = useRef(false);

  // Check if current page has no-pull-refresh (chat/story screens)
  const isEnabled = useCallback(() => {
    // Always enabled on known safe paths
    if (ALWAYS_ENABLED_PATHS.some((p) => pathname.startsWith(p))) return true;
    // Home page: check if body has no-pull-refresh class (set by page.tsx for chat/onboarding screens)
    if (pathname === "/") {
      return !document.body.classList.contains("no-pull-refresh");
    }
    // Teacher page: check class too
    if (pathname.startsWith("/teacher")) {
      return !document.body.classList.contains("no-pull-refresh");
    }
    // Default: enabled
    return true;
  }, [pathname]);

  const doRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Clear all SW caches to ensure fresh content
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // Trigger SW update check
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
    } catch {
      // Ignore cache errors — proceed with reload
    }
    window.location.reload();
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!isEnabled()) {
        isDisabledRef.current = true;
        return;
      }
      isDisabledRef.current = false;

      // Only activate when page is at absolute top
      const scrollTop =
        document.scrollingElement?.scrollTop ??
        document.documentElement.scrollTop ??
        0;
      if (scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDisabledRef.current || isRefreshing) return;
      if (startYRef.current === 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only track downward swipes
      if (diff <= 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      // Check scroll position again (might have scrolled during touch)
      const scrollTop =
        document.scrollingElement?.scrollTop ??
        document.documentElement.scrollTop ??
        0;
      if (scrollTop > 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      isPullingRef.current = true;
      // Apply resistance — diminishing returns past threshold
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);

      // Prevent native scroll while pulling
      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (isDisabledRef.current) return;

      if (isPullingRef.current && pullDistance >= THRESHOLD) {
        doRefresh();
      } else {
        setPullDistance(0);
      }
      startYRef.current = 0;
      isPullingRef.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isEnabled, pullDistance, doRefresh, isRefreshing]);

  // Don't render anything if not pulling
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = pullDistance * 3; // spin as user pulls

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullDistance - 30, 40)}px)`,
        opacity: progress,
        transition: pullDistance === 0 ? "all 0.3s ease" : "none",
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: "rgb(var(--cream))",
          border: "1.5px solid rgba(196,168,130,0.2)",
        }}
      >
        {isRefreshing ? (
          <span
            className="w-4 h-4 border-2 border-brown-pale/30 border-t-coral rounded-full animate-spin"
            aria-label="새로고침 중"
          />
        ) : (
          <span
            className="text-base"
            style={{ transform: `rotate(${rotation}deg)`, display: "inline-block" }}
            aria-hidden="true"
          >
            ↓
          </span>
        )}
      </div>
    </div>
  );
}
