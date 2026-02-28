"use client";

import { create } from "zustand";

export type FontSize = "small" | "medium" | "large";

interface SettingsState {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FONT_SIZE_KEY = "mamastale-font-size";

function getStoredFontSize(): FontSize {
  if (typeof window === "undefined") return "medium";
  const stored = localStorage.getItem(FONT_SIZE_KEY);
  if (stored === "small" || stored === "medium" || stored === "large") return stored;
  return "medium";
}

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

export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: getStoredFontSize(),

  setFontSize: (size: FontSize) => {
    localStorage.setItem(FONT_SIZE_KEY, size);
    set({ fontSize: size });
  },
}));
