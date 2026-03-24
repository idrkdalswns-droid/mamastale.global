"use client";

import { create } from "zustand";
import { useEffect } from "react";

export type FontSize = "small" | "medium" | "large";

interface SettingsState {
  fontSize: FontSize;
  _hydrated: boolean;
  setFontSize: (size: FontSize) => void;
  _hydrate: () => void;
}

const FONT_SIZE_KEY = "mamastale-font-size";

export const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 13,
  medium: 15,
  large: 17,
};

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: "작게",
  medium: "보통",
  large: "크게",
};

// LAUNCH-FIX: Always initialize with "medium" to prevent hydration mismatch.
// localStorage is read on client-side via _hydrate() after mount.
export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: "medium",
  _hydrated: false,

  setFontSize: (size: FontSize) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(FONT_SIZE_KEY, size); } catch { /* Fix 20: Private browsing */ }
    }
    set({ fontSize: size });
  },

  _hydrate: () => {
    if (typeof window === "undefined") return;
    // P1-1: 구 키(mamastale_font_size, 숫자) → 신 키(mamastale-font-size, 문자열) 마이그레이션
    try {
      const oldKey = "mamastale_font_size";
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal && !localStorage.getItem(FONT_SIZE_KEY)) {
        const num = parseInt(oldVal, 10);
        const migrated: FontSize = num <= 13 ? "small" : num >= 17 ? "large" : "medium";
        localStorage.setItem(FONT_SIZE_KEY, migrated);
        localStorage.removeItem(oldKey);
      }
    } catch { /* ignore */ }

    let stored: string | null = null;
    try { stored = localStorage.getItem(FONT_SIZE_KEY); } catch { /* Fix 20: Private browsing crash prevention */ }
    if (stored === "small" || stored === "medium" || stored === "large") {
      set({ fontSize: stored, _hydrated: true });
    } else {
      set({ _hydrated: true });
    }
  },
}));

/** Hook to hydrate settings from localStorage after mount (avoids SSR mismatch) */
export function useSettingsHydration() {
  const hydrate = useSettingsStore((s) => s._hydrate);
  const hydrated = useSettingsStore((s) => s._hydrated);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);
}
