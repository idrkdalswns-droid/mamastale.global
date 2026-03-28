import type { StateCreator } from "zustand";

export type TQStatus = "idle" | "active" | "generating" | "completed" | "failed";

export interface SessionSlice {
  sessionId: string | null;
  status: TQStatus;
  currentPhase: number;
  isFreeTrial: boolean;
  // Actions
  initSession: (sessionId: string, phase: number, isFreeTrial?: boolean) => void;
  setStatus: (status: TQStatus) => void;
  setPhase: (phase: number) => void;
  resetSession: () => void;
}

export const createSessionSlice: StateCreator<
  SessionSlice,
  [],
  [],
  SessionSlice
> = (set) => ({
  sessionId: null,
  status: "idle",
  currentPhase: 1,
  isFreeTrial: false,

  initSession: (sessionId, phase, isFreeTrial = false) =>
    set({ sessionId, status: "active", currentPhase: phase, isFreeTrial }),

  setStatus: (status) => set({ status }),

  setPhase: (phase) => set({ currentPhase: phase }),

  resetSession: () =>
    set({
      sessionId: null,
      status: "idle",
      currentPhase: 1,
      isFreeTrial: false,
    }),
});
