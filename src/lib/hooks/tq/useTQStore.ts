"use client";

import { create } from "zustand";
import { createSessionSlice, type SessionSlice } from "./sessionSlice";
import { createQuestionSlice, type QuestionSlice } from "./questionSlice";
import { createGenerationSlice, type GenerationSlice } from "./generationSlice";

export type TQStore = SessionSlice & QuestionSlice & GenerationSlice & {
  /** Persist minimal state to localStorage for session recovery */
  persist: () => void;
  /** Restore from localStorage, returns true if restored */
  restore: () => boolean;
  /** Full reset (all slices) */
  resetAll: () => void;
};

const STORAGE_KEY = "mamastale_tq_session";

export const useTQStore = create<TQStore>()((set, get, api) => ({
  ...createSessionSlice(set, get, api),
  ...createQuestionSlice(set, get, api),
  ...createGenerationSlice(set, get, api),

  persist: () => {
    const state = get();
    if (!state.sessionId) return;
    try {
      const data = {
        sessionId: state.sessionId,
        currentPhase: state.currentPhase,
        currentQuestionIndex: state.currentQuestionIndex,
        status: state.status,
        isFreeTrial: state.isFreeTrial,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota exceeded — silently ignore */ }
  },

  restore: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      // 30-day expiry
      if (Date.now() - data.savedAt > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      set({
        sessionId: data.sessionId,
        currentPhase: data.currentPhase || 1,
        currentQuestionIndex: data.currentQuestionIndex || 0,
        status: data.status || "active",
        isFreeTrial: data.isFreeTrial || false,
      });
      return true;
    } catch {
      return false;
    }
  },

  resetAll: () => {
    get().resetSession();
    get().resetQuestions();
    get().resetGeneration();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  },
}));
