"use client";

import { create } from "zustand";
import type { Message, ChatApiResponse } from "@/lib/types/chat";
import type { Scene } from "@/lib/types/story";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "mamastale_chat_state";

/** Build headers with auth token for API calls (belt-and-suspenders for edge cookie issues) */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const supabase = createClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    }
  } catch { /* ignore */ }
  return headers;
}

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
  /** Update completed scenes (e.g. after user editing) */
  updateScenes: (scenes: Scene[]) => void;
  /** Retry saving story to DB (e.g. after auth is established) */
  retrySaveStory: () => Promise<boolean>;
}

let msgCounter = 0;
const genId = (prefix: string) => `${prefix}_${Date.now()}_${++msgCounter}`;

const AGE_LABELS: Record<string, string> = {
  "0-2": "어린 아이를 돌보시느라",
  "3-5": "한창 호기심 많은 아이를 키우시느라",
  "6-8": "초등학교에 들어간 아이를 돌보시느라",
};

function buildInitialMessage(): string {
  let childAge = "";
  try { childAge = localStorage?.getItem("mamastale_child_age") || ""; } catch {}
  const ageNote = childAge && AGE_LABELS[childAge]
    ? `${AGE_LABELS[childAge]} 매일 분주하시죠.\n\n`
    : "";
  return `안녕하세요, 어머니.\n\n${ageNote}이곳은 어머니의 이야기를 안전하게 나눌 수 있는 공간이에요. 어떤 감정이든, 어떤 경험이든 있는 그대로 이야기해 주셔도 괜찮습니다.\n\n오늘 어머니의 마음은 어떠신가요?`;
}

const makeInitialMessages = (): Message[] => [
  {
    id: genId("init"),
    role: "assistant",
    content: buildInitialMessage(),
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

      // Read child age from localStorage (set during onboarding)
      let childAge: string | undefined;
      try { childAge = localStorage.getItem("mamastale_child_age") || undefined; } catch {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: state.sessionId,
          childAge,
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

      // IN-7: Save completed story — set storySaved synchronously BEFORE async fetch to prevent race
      if (data.isStoryComplete && data.scenes && data.scenes.length > 0 && !get().storySaved) {
        set({ storySaved: true }); // Synchronous mutex — prevents concurrent save attempts
        try {
          const storyTitle = "나의 마음 동화";
          const authHeaders = await getAuthHeaders();
          const saveRes = await fetch("/api/stories", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              title: storyTitle,
              scenes: data.scenes,
              sessionId: state.sessionId || undefined,
            }),
          });

          if (saveRes.ok) {
            const saveData = await saveRes.json();
            set({
              storySaveError: null,
              completedStoryId: saveData.id || get().completedStoryId,
            });
          } else if (saveRes.status === 401) {
            set({ storySaved: false, storySaveError: "login_required" });
            get().persistToStorage(); // Backup for recovery after login/refresh
          } else if (saveRes.status === 403) {
            set({ storySaved: false, storySaveError: "no_tickets" });
            get().persistToStorage();
          } else {
            set({ storySaved: false, storySaveError: "save_failed" });
            get().persistToStorage();
          }
        } catch {
          set({ storySaved: false, storySaveError: "save_failed" });
          get().persistToStorage();
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

      // IN-11: Validate restored data shape to prevent corrupted state
      if (
        typeof snapshot !== "object" || snapshot === null ||
        typeof snapshot.savedAt !== "number" ||
        !Array.isArray(snapshot.messages) ||
        !snapshot.messages.every(
          (m: unknown) =>
            typeof m === "object" && m !== null &&
            typeof (m as Record<string, unknown>).role === "string" &&
            typeof (m as Record<string, unknown>).content === "string"
        )
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Only restore if saved within last 24 hours (allows time for email verification)
      if (Date.now() - snapshot.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Validate currentPhase is a valid value
      const validPhases = [1, 2, 3, 4];
      const phase = validPhases.includes(snapshot.currentPhase) ? snapshot.currentPhase : 1;

      set({
        sessionId: typeof snapshot.sessionId === "string" ? snapshot.sessionId : "",
        messages: snapshot.messages,
        currentPhase: phase as 1 | 2 | 3 | 4,
        visitedPhases: Array.isArray(snapshot.visitedPhases) ? snapshot.visitedPhases : [1],
        storyDone: snapshot.storyDone === true,
        completedScenes: Array.isArray(snapshot.completedScenes) ? snapshot.completedScenes : [],
        isLoading: false,
        isTransitioning: false,
        storySaved: false,
        storySaveError: null,
      });
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      // IN-11: Clear corrupted data on parse failure
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
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

  updateScenes: (scenes: Scene[]) => {
    set({ completedScenes: scenes });
  },

  retrySaveStory: async () => {
    const state = get();
    if (state.storySaved || state.completedScenes.length === 0) return false;

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: "나의 마음 동화",
          scenes: state.completedScenes,
          sessionId: state.sessionId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set({
          storySaved: true,
          storySaveError: null,
          completedStoryId: data.id || state.completedStoryId,
        });
        // Clear backup since story is now safely in DB
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        return true;
      }
      return false;
    } catch {
      return false;
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
