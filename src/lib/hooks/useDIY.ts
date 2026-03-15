"use client";

import { create } from "zustand";

interface DIYSaveData {
  storyId: string;
  imageOrder: number[];
  texts: Record<number, string>;
  // v3.1: optional for backward compatibility with old saved data
  step?: "sort" | "write" | "complete";
  currentPage?: number;
  savedStoryId?: string | null;
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
  deleteImage: (imageIndex: number) => void;
  restoreImage: (imageIndex: number) => void;
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

// Debounce timer for setText
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => useDIYStore.getState().save(), 500);
}

function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  useDIYStore.getState().save();
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
    // imageOrder 검증 — 최소 3장, 인덱스 유효, 중복 없음
    const validOrder = saved?.imageOrder &&
      saved.imageOrder.length >= 3 &&
      saved.imageOrder.every((i: number) => i >= 0 && i < imageCount) &&
      new Set(saved.imageOrder).size === saved.imageOrder.length;
    if (saved && validOrder) {
      set({
        storyId,
        imageOrder: saved.imageOrder,
        texts: saved.texts ?? {},
        step: saved.step ?? "sort",               // 하위 호환: old data엔 step 없음
        currentPage: saved.currentPage ?? 0,       // 하위 호환
        savedStoryId: saved.savedStoryId ?? null,   // 하위 호환
      });
    } else {
      set({
        storyId,
        imageOrder: Array.from({ length: imageCount }, (_, i) => i),
        texts: {},
        step: "sort",
        currentPage: 0,
        savedStoryId: null,
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
    debouncedSave();
  },

  setCurrentPage: (page) => {
    flushSave(); // 현재 페이지 텍스트 즉시 플러시 후 페이지 전환
    set({ currentPage: page });
    get().save();
  },

  setStep: (step) => {
    flushSave(); // 미저장 텍스트 즉시 플러시
    const updates: Partial<Pick<DIYState, "step" | "savedStoryId">> = { step };
    // 편집 단계로 되돌아가면 저장 상태 초기화
    if (step === "sort" || step === "write") {
      updates.savedStoryId = null;
    }
    set(updates);
    get().save();
  },

  deleteImage: (imageIndex: number) => {
    const { imageOrder, currentPage } = get();
    const newOrder = imageOrder.filter((i) => i !== imageIndex);
    if (newOrder.length < 3) return; // 최소 3장
    set({
      imageOrder: newOrder,
      currentPage: Math.min(currentPage, newOrder.length - 1),
    });
    get().save();
  },

  restoreImage: (imageIndex: number) => {
    const { imageOrder } = get();
    if (imageOrder.includes(imageIndex)) return; // 이미 있으면 무시
    set({ imageOrder: [...imageOrder, imageIndex] });
    get().save();
  },

  save: () => {
    const { storyId, imageOrder, texts, step, currentPage, savedStoryId } = get();
    if (!storyId) return;
    try {
      const data: DIYSaveData = {
        storyId,
        imageOrder,
        texts,
        step,
        currentPage,
        savedStoryId,
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

  setSavedStoryId: (id) => {
    set({ savedStoryId: id });
    get().save();
  },
}));
