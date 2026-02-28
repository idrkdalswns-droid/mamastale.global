"use client";

import { create } from "zustand";
import type { Message, ChatApiResponse } from "@/lib/types/chat";
import type { Scene } from "@/lib/types/story";

const STORAGE_KEY = "mamastale_chat_state";

interface ChatState {
  sessionId: string;
  messages: Message[];
  currentPhase: 1 | 2 | 3 | 4;
  visitedPhases: number[];
  isLoading: boolean;
  isTransitioning: boolean;
  storyDone: boolean;
  completedStoryId: string | null;
  completedScenes: Scene[];
  storySaved: boolean;
  storySaveError: string | null;

  initSession: (sessionId: string) => void;
  sendMessage: (text: string) => Promise<void>;
  setTransitioning: (v: boolean) => void;
  reset: () => void;
  /** Save current chat state to localStorage (for signup resume) */
  persistToStorage: () => void;
  /** Restore chat state from localStorage. Returns true if restored. */
  restoreFromStorage: () => boolean;
  /** Clear saved state from localStorage */
  clearStorage: () => void;
}

let msgCounter = 0;
const genId = (prefix: string) => `${prefix}_${Date.now()}_${++msgCounter}`;

const INITIAL_MSG_CONTENT =
  "안녕하세요, 어머니.\n\n이곳은 어머니의 이야기를 안전하게 나눌 수 있는 공간이에요. 어떤 감정이든, 어떤 경험이든 있는 그대로 이야기해 주셔도 괜찮습니다.\n\n오늘 어머니의 마음은 어떠신가요?";

const makeInitialMessages = (): Message[] => [
  {
    id: genId("init"),
    role: "assistant",
    content: INITIAL_MSG_CONTENT,
    phase: 1,
  },
];

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: "",
  messages: makeInitialMessages(),
  currentPhase: 1,
  visitedPhases: [1],
  isLoading: false,
  isTransitioning: false,
  storyDone: false,
  completedStoryId: null,
  completedScenes: [],
  storySaved: false,
  storySaveError: null,

  initSession: (sessionId: string) => {
    // Don't overwrite if session already exists (LOW-12 fix)
    if (!get().sessionId) {
      set({ sessionId });
    }
  },

  sendMessage: async (text: string) => {
    const state = get();
    if (!text.trim() || state.isLoading) return;

    const userMsg: Message = {
      id: genId("user"),
      role: "user",
      content: text.trim(),
    };
    const updatedMessages = [...state.messages, userMsg];
    set({ messages: updatedMessages, isLoading: true });

    try {
      // Filter out client-side error messages before sending to API
      const apiMessages = updatedMessages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: state.sessionId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "API request failed");
      }

      const data: ChatApiResponse = await res.json();

      // Handle phase transition
      if (data.phase && data.phase !== state.currentPhase) {
        set({ isTransitioning: true });
        await new Promise((r) => setTimeout(r, 600));
        set((s) => ({
          currentPhase: data.phase as 1 | 2 | 3 | 4,
          visitedPhases: s.visitedPhases.includes(data.phase!)
            ? s.visitedPhases
            : [...s.visitedPhases, data.phase!],
        }));
        await new Promise((r) => setTimeout(r, 500));
        set({ isTransitioning: false });
      }

      const assistantMsg: Message = {
        id: genId("asst"),
        role: "assistant",
        content: data.content,
        phase: data.phase || state.currentPhase,
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        storyDone: data.isStoryComplete || s.storyDone,
        completedStoryId: data.storyId || s.completedStoryId,
        completedScenes:
          data.scenes && data.scenes.length > 0
            ? data.scenes
            : s.completedScenes,
      }));

      // Save completed story to database (guard against duplicate saves)
      if (data.isStoryComplete && data.scenes && data.scenes.length > 0 && !get().storySaved) {
        try {
          const storyTitle = "나의 치유 동화";
          const saveRes = await fetch("/api/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: storyTitle,
              scenes: data.scenes,
              sessionId: state.sessionId || undefined,
            }),
          });

          if (saveRes.ok) {
            const saveData = await saveRes.json();
            set({
              storySaved: true,
              storySaveError: null,
              completedStoryId: saveData.id || get().completedStoryId,
            });
          } else if (saveRes.status === 401) {
            // Anonymous user — story not saved to DB
            set({
              storySaved: false,
              storySaveError: "login_required",
            });
          } else if (saveRes.status === 403) {
            // No tickets remaining
            set({
              storySaved: false,
              storySaveError: "no_tickets",
            });
          } else {
            set({
              storySaved: false,
              storySaveError: "save_failed",
            });
          }
        } catch {
          set({
            storySaved: false,
            storySaveError: "save_failed",
          });
          console.warn("Failed to save story to database");
        }
      }
    } catch (err) {
      // Show API error messages (Korean) as-is, but replace raw browser errors
      // (e.g. "Failed to fetch", "Load failed") with a friendly Korean message
      const errMessage =
        err instanceof Error && err.message && /[가-힣]/.test(err.message)
          ? err.message
          : "네트워크에 문제가 생겼어요. 잠시 후 다시 이야기해 주세요.";
      const errorMsg: Message = {
        id: genId("err"),
        role: "assistant",
        content: errMessage,
        phase: state.currentPhase,
        isError: true,
      };
      set((s) => ({ messages: [...s.messages, errorMsg] }));
    } finally {
      set({ isLoading: false });
    }
  },

  setTransitioning: (v: boolean) => set({ isTransitioning: v }),

  persistToStorage: () => {
    try {
      const s = get();
      const snapshot = {
        sessionId: s.sessionId,
        messages: s.messages,
        currentPhase: s.currentPhase,
        visitedPhases: s.visitedPhases,
        storyDone: s.storyDone,
        completedScenes: s.completedScenes,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage not available
    }
  },

  restoreFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      // Only restore if saved within last 24 hours (allows time for email verification)
      if (Date.now() - snapshot.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      set({
        sessionId: snapshot.sessionId || "",
        messages: snapshot.messages || makeInitialMessages(),
        currentPhase: snapshot.currentPhase || 1,
        visitedPhases: snapshot.visitedPhases || [1],
        storyDone: snapshot.storyDone || false,
        completedScenes: snapshot.completedScenes || [],
        isLoading: false,
        isTransitioning: false,
        storySaved: false,
        storySaveError: null,
      });
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  },

  clearStorage: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  reset: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    set({
      sessionId: "",
      messages: makeInitialMessages(),
      currentPhase: 1,
      visitedPhases: [1],
      isLoading: false,
      isTransitioning: false,
      storyDone: false,
      completedStoryId: null,
      completedScenes: [],
      storySaved: false,
      storySaveError: null,
    });
  },
}));
