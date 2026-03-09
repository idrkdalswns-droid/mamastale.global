"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "mamastale_theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // R5-4: Guard localStorage / matchMedia access (SSR & restricted environments)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
      const isDark = saved === "dark" || (!saved && prefersDark);
      setDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {
      // localStorage blocked or matchMedia unavailable — stay with default (light)
    }
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try { localStorage.setItem(STORAGE_KEY, next ? "dark" : "light"); } catch { /* quota / blocked */ }
      return next;
    });
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="w-11 h-11 rounded-full flex items-center justify-center text-lg active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
      style={{
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
      }}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
