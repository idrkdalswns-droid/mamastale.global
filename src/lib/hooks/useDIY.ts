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

export const useDIYStore = create<DIYState>((set, get) => ({
  storyId: null,
  step: "sort",
  imageOrder: [],
  texts: {},
  currentPage: 0,
  savedStoryId: null,

  initStory: (storyId, imageCount) => {
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
