"use client";

import { create } from "zustand";

interface DIYSaveData {
  storyId: string;
  imageOrder: number[];
  texts: Record<number, string>;
  updatedAt: string;
}

interface DIYState {
  storyId: string | null;
  step: "sort" | "write" | "complete";
  imageOrder: number[];
  texts: Record<number, string>;
  currentPage: number;
  savedStoryId: string | null; // DB에 저장된 story ID

  // Actions
  initStory: (storyId: string, imageCount: number) => void;
  setImageOrder: (order: number[]) => void;
  setText: (imageIndex: number, text: string) => void;
  setCurrentPage: (page: number) => void;
  setStep: (step: "sort" | "write" | "complete") => void;
  save: () => void;
  load: (storyId: string) => DIYSaveData | null;
  reset: () => void;
  setSavedStoryId: (id: string | null) => void;
}

function getStorageKey(storyId: string) {
  return `mamastale_diy_${storyId}`;
}

const DIY_STORAGE_PREFIX = "mamastale_diy_";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30일
const MAX_ITEMS = 3;

/** #16: 오래된 DIY localStorage 데이터 정리 */
function cleanupOldDIYData() {
  try {
    const now = Date.now();
    const items: { key: string; updatedAt: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DIY_STORAGE_PREFIX)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key)!);
        const age = now - new Date(data.updatedAt).getTime();
        if (age > MAX_AGE_MS) { localStorage.removeItem(key); continue; }
        items.push({ key, updatedAt: new Date(data.updatedAt).getTime() });
      } catch { localStorage.removeItem(key!); }
    }
    // 최대 3개까지만 유지 (오래된 순 삭제)
    items.sort((a, b) => b.updatedAt - a.updatedAt);
    items.slice(MAX_ITEMS).forEach((item) => localStorage.removeItem(item.key));
  } catch {
    // localStorage unavailable
  }
}

export const useDIYStore = create<DIYState>((set, get) => ({
  storyId: null,
  step: "sort",
  imageOrder: [],
  texts: {},
  currentPage: 0,
  savedStoryId: null,

  initStory: (storyId, imageCount) => {
    // #16: 오래된 데이터 정리
    cleanupOldDIYData();
    // Try to restore saved data
    const saved = get().load(storyId);
    if (saved) {
      set({
        storyId,
        imageOrder: saved.imageOrder,
        texts: saved.texts,
        step: "sort",
        currentPage: 0,
      });
    } else {
      set({
        storyId,
        imageOrder: Array.from({ length: imageCount }, (_, i) => i),
        texts: {},
        step: "sort",
        currentPage: 0,
      });
    }
  },

  setImageOrder: (order) => {
    set({ imageOrder: order });
    get().save();
  },

  setText: (imageIndex, text) => {
    set((state) => ({
      texts: { ...state.texts, [imageIndex]: text },
    }));
    get().save();
  },

  setCurrentPage: (page) => set({ currentPage: page }),

  setStep: (step) => set({ step }),

  save: () => {
    const { storyId, imageOrder, texts } = get();
    if (!storyId) return;
    try {
      const data: DIYSaveData = {
        storyId,
        imageOrder,
        texts,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(getStorageKey(storyId), JSON.stringify(data));
    } catch {
      // localStorage full or unavailable
    }
  },

  load: (storyId) => {
    try {
      const raw = localStorage.getItem(getStorageKey(storyId));
      if (!raw) return null;
      return JSON.parse(raw) as DIYSaveData;
    } catch {
      return null;
    }
  },

  reset: () => {
    const { storyId } = get();
    if (storyId) {
      try { localStorage.removeItem(getStorageKey(storyId)); } catch {}
    }
    set({
      storyId: null,
      step: "sort",
      imageOrder: [],
      texts: {},
      currentPage: 0,
      savedStoryId: null,
    });
  },

  setSavedStoryId: (id) => set({ savedStoryId: id }),
}));
