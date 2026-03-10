"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "mamastale_push_dismissed";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Convert VAPID public key (base64url) to Uint8Array for PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushPermissionBannerProps {
  /** Delay before showing (ms) — default 2000 */
  delay?: number;
  /** Auth token getter for API calls */
  getHeaders?: (opts?: { json?: boolean }) => Promise<Record<string, string>>;
}

/**
 * Sprint 4-A: Push notification permission banner
 *
 * Shows after story completion to ask for notification permission.
 * Handles the full flow: permission request → push subscribe → save to server.
 */
export function PushPermissionBanner({ delay = 2000, getHeaders }: PushPermissionBannerProps) {
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Skip if: no VAPID key, not supported, already subscribed, or user dismissed
    if (!VAPID_PUBLIC_KEY) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // User denied — hide and don't show again for this session
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, "denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Send subscription to server
      const headers = getHeaders
        ? await getHeaders({ json: true })
        : { "Content-Type": "application/json" };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      localStorage.setItem(STORAGE_KEY, "subscribed");
      setVisible(false);
    } catch (err) {
      console.warn("[Push] Subscribe failed:", err);
      setVisible(false);
    } finally {
      setSubscribing(false);
    }
  }, [getHeaders]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Don't show again for 7 days
    localStorage.setItem(STORAGE_KEY, `dismissed:${Date.now()}`);
  }, []);

  // Check if 7-day dismiss period expired
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    if (stored === "subscribed" || stored === "denied") return;
    if (stored.startsWith("dismissed:")) {
      const ts = parseInt(stored.split(":")[1], 10);
      if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-32px)] max-w-[398px]"
        >
          <div
            className="rounded-2xl p-5 shadow-lg"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(196,149,106,0.12)",
            }}
          >
            <div className="flex items-start gap-3">
              {/* Bell icon */}
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: "rgba(224,122,95,0.1)" }}
              >
                <span className="text-lg">🔔</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brown mb-1">
                  알림을 받아보시겠어요?
                </p>
                <p className="text-[12px] text-brown-light leading-relaxed break-keep">
                  새로운 동화 소식과 마음 챙김 리마인더를 보내드려요
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-full text-[13px] font-medium text-brown-mid transition-all active:scale-[0.97]"
                style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
              >
                다음에
              </button>
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="flex-1 py-2.5 rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                }}
              >
                {subscribing ? "설정 중..." : "좋아요!"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
