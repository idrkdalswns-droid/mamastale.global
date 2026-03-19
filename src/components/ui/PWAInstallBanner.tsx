"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "mamastale_pwa_install";
const STORY_COUNT_KEY = "mamastale_story_count";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Safe localStorage helpers (private browsing / QuotaExceededError safe)
function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/**
 * Sprint 4-B: PWA Install Prompt Banner
 *
 * Shows "홈 화면에 추가" prompt after 2nd story completion.
 * Captures the `beforeinstallprompt` event and defers it.
 */
export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed or dismissed permanently
    const stored = safeGetItem(STORAGE_KEY);
    if (stored === "installed" || stored === "dismissed_permanent") return;

    // Check dismiss expiry (30 days)
    if (stored?.startsWith("dismissed:")) {
      const ts = parseInt(stored.split(":")[1], 10);
      if (Date.now() - ts < 30 * 24 * 60 * 60 * 1000) return;
      safeRemoveItem(STORAGE_KEY);
    }

    // Check if user has completed at least 2 stories
    const storyCount = parseInt(safeGetItem(STORY_COUNT_KEY) || "0", 10);
    if (storyCount < 2) return;

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      // Show banner after short delay
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already standalone (PWA already installed)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      safeSetItem(STORAGE_KEY, "installed");
      return;
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === "accepted") {
      safeSetItem(STORAGE_KEY, "installed");
    } else {
      safeSetItem(STORAGE_KEY, `dismissed:${Date.now()}`);
    }

    deferredPromptRef.current = null;
    setVisible(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    safeSetItem(STORAGE_KEY, `dismissed:${Date.now()}`);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
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
              {/* App icon */}
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                <span className="text-white text-sm font-serif font-bold">M</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brown mb-1">
                  홈 화면에 추가하시겠어요?
                </p>
                <p className="text-[12px] text-brown-light leading-relaxed break-keep">
                  한 번의 탭으로 바로 동화를 만들 수 있어요
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
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                }}
              >
                홈 화면에 추가
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Increment story completion counter.
 * Call this when a story is successfully completed.
 */
export function incrementStoryCount(): void {
  if (typeof window === "undefined") return;
  const current = parseInt(safeGetItem(STORY_COUNT_KEY) || "0", 10);
  safeSetItem(STORY_COUNT_KEY, String(current + 1));
}
