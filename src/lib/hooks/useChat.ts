"use client";

import { create } from "zustand";
import type { Message, ChatApiResponse, ChatStreamEvent, StorySeedState } from "@/lib/types/chat";
import type { Scene } from "@/lib/types/story";
import { createClient } from "@/lib/supabase/client";

// ─── Two separate storage keys ───
// AUTH: auto-consumed after login/signup redirect (destructive restore)
const STORAGE_KEY = "mamastale_chat_state";
// DRAFT: persistent manual save — NEVER deleted except by explicit user action or story completion
const DRAFT_KEY = "mamastale_chat_draft";

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

/** Validate snapshot shape to prevent corrupted state */
function isValidSnapshot(snapshot: unknown): snapshot is Record<string, unknown> {
  if (typeof snapshot !== "object" || snapshot === null) return false;
  const s = snapshot as Record<string, unknown>;
  if (typeof s.savedAt !== "number") return false;
  if (!Array.isArray(s.messages)) return false;
  return s.messages.every(
    (m) =>
      typeof m === "object" && m !== null &&
      "role" in m && typeof (m as Record<string, unknown>).role === "string" &&
      "content" in m && typeof (m as Record<string, unknown>).content === "string"
  );
}

/** Apply snapshot to Zustand state (shared between restoreFromStorage and restoreDraft) */
function snapshotToState(snapshot: Record<string, unknown>) {
  const validPhases = [1, 2, 3, 4];
  const phase = validPhases.includes(snapshot.currentPhase as number)
    ? (snapshot.currentPhase as 1 | 2 | 3 | 4)
    : 1;

  return {
    sessionId: typeof snapshot.sessionId === "string" ? snapshot.sessionId : "",
    messages: snapshot.messages as Message[],
    currentPhase: phase,
    visitedPhases: Array.isArray(snapshot.visitedPhases) ? snapshot.visitedPhases as number[] : [1],
    turnCountInCurrentPhase: typeof snapshot.turnCountInCurrentPhase === "number" ? snapshot.turnCountInCurrentPhase : 0,
    storyDone: snapshot.storyDone === true,
    completedScenes: Array.isArray(snapshot.completedScenes) ? snapshot.completedScenes as Scene[] : [],
    storySeed: (typeof snapshot.storySeed === "object" && snapshot.storySeed !== null) ? snapshot.storySeed as StorySeedState : {},
    isLoading: false,
    isTransitioning: false,
    storySaved: false,
    storySaveError: null,
  };
}

interface ChatState {
  sessionId: string;
  messages: Message[];
  currentPhase: 1 | 2 | 3 | 4;
  visitedPhases: number[];
  turnCountInCurrentPhase: number;
  isLoading: boolean;
  isTransitioning: boolean;
  storyDone: boolean;
  completedStoryId: string | null;
  completedScenes: Scene[];
  storySaved: boolean;
  storySaveError: string | null;
  /** Whether the current session was restored from a persistent draft */
  isFromDraft: boolean;
  /** Whether the completed story was generated with the premium (Opus) model */
  isPremiumStory: boolean;
  /** Story Seed — therapeutic anchor tracked across phases */
  storySeed: StorySeedState;

  initSession: (sessionId: string) => void;
  sendMessage: (text: string) => Promise<void>;
  /** Send message with SSE streaming (falls back to sendMessage on error) */
  sendMessageStreaming: (text: string) => Promise<void>;
  setTransitioning: (v: boolean) => void;
  reset: () => void;
  /** Save current chat state for auth redirect (auto-consumed on return) */
  persistToStorage: () => void;
  /** Restore from auth redirect save. DESTRUCTIVE: deletes after restore. */
  restoreFromStorage: () => boolean;
  /** Save current chat as a persistent draft (임시 저장) */
  saveDraft: () => void;
  /** Restore from persistent draft. NON-DESTRUCTIVE: draft stays in localStorage. */
  restoreDraft: () => boolean;
  /** Check if any saved state exists (draft or auth). Returns info or null. */
  getDraftInfo: () => { phase: number; messageCount: number; savedAt: number; source: string } | null;
  /** Clear ALL saved state (both auth and draft) */
  clearStorage: () => void;
  /** Clear only the persistent draft */
  clearDraft: () => void;
  /** Update completed scenes (e.g. after user editing) */
  updateScenes: (scenes: Scene[]) => void;
  /** Retry saving story to DB (e.g. after auth is established) */
  retrySaveStory: () => Promise<boolean>;
}

let msgCounter = 0;
const genId = (prefix: string) => `${prefix}_${Date.now()}_${++msgCounter}`;

// P1-FIX(KR-3): Module-level lock to prevent concurrent save/retry operations
// R3-FIX: Add timeout fallback to prevent permanent lock on network failure
let saveInFlight = false;
let saveInFlightTimer: ReturnType<typeof setTimeout> | null = null;

const AGE_LABELS: Record<string, string> = {
  "0-2": "어린 아이를 돌보시느라",
  "3-5": "한창 호기심 많은 아이를 키우시느라",
  "6-8": "초등학교에 들어간 아이를 돌보시느라",
  "9-13": "한창 자라나는 아이를 키우시느라",
};

const ROLE_TITLES: Record<string, { greeting: string; honorific: string }> = {
  "엄마": { greeting: "어머니", honorific: "어머니" },
  "아빠": { greeting: "아버지", honorific: "아버지" },
  "할머니": { greeting: "할머니", honorific: "할머니" },
  "할아버지": { greeting: "할아버지", honorific: "할아버지" },
  "기타": { greeting: "보호자님", honorific: "보호자님" },
};

function buildInitialMessage(): string {
  let childAge = "";
  let parentRole = "";
  try {
    childAge = localStorage?.getItem("mamastale_child_age") || "";
    parentRole = localStorage?.getItem("mamastale_parent_role") || "";
  } catch {}

  const role = ROLE_TITLES[parentRole] || ROLE_TITLES["엄마"];
  const ageNote = childAge && AGE_LABELS[childAge]
    ? `${AGE_LABELS[childAge]} 매일 분주하시죠.\n\n`
    : "";

  return `안녕하세요, ${role.greeting}.\n\n${ageNote}이곳은 ${role.honorific}의 이야기를 안전하게 나눌 수 있는 공간이에요. 어떤 감정이든, 어떤 경험이든 있는 그대로 이야기해 주셔도 괜찮습니다.\n\n처음이라 어색하실 수 있지만, 진솔하게 답변해 주실수록 아이를 위한 동화가 더 진정성 있게 완성돼요. ${role.honorific}의 이야기가 곧 동화의 이야기가 됩니다.\n\n각 단계마다 약 10번의 대화를 나눌 수 있어요. 한 메시지 한 메시지, 아이를 생각하며 진심을 담아 이야기해 주세요.\n\n오늘 ${role.honorific}의 마음은 어떠신가요?`;
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
  turnCountInCurrentPhase: 0,
  isLoading: false,
  isTransitioning: false,
  storyDone: false,
  completedStoryId: null,
  completedScenes: [],
  storySaved: false,
  storySaveError: null,
  isFromDraft: false,
  isPremiumStory: false,
  storySeed: {},

  initSession: (sessionId: string) => {
    // Don't overwrite if session already exists (LOW-12 fix)
    if (!get().sessionId) {
      // Rebuild initial messages to pick up latest localStorage values
      // (e.g. child age set during onboarding AFTER Zustand module-level init)
      set({ sessionId, messages: makeInitialMessages() });
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
    const newTurnCount = state.turnCountInCurrentPhase + 1;
    set({ messages: updatedMessages, isLoading: true, turnCountInCurrentPhase: newTurnCount });

    try {
      // Filter out client-side error messages before sending to API
      const apiMessages = updatedMessages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Read onboarding data from localStorage (set during onboarding)
      let childAge: string | undefined;
      let parentRole: string | undefined;
      let parentAge: string | undefined;
      try {
        childAge = localStorage.getItem("mamastale_child_age") || undefined;
        parentRole = localStorage.getItem("mamastale_parent_role") || undefined;
        parentAge = localStorage.getItem("mamastale_parent_age") || undefined;
      } catch {}

      // CTO-FIX: Include Bearer token for premium detection in WebView/mobile
      const chatHeaders = await getAuthHeaders();

      // ROUND1-FIX: 90s timeout to prevent infinite hang when Claude API is slow
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: chatHeaders,
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: state.sessionId,
          childAge,
          parentRole,
          parentAge,
          currentPhase: state.currentPhase,
          turnCountInCurrentPhase: newTurnCount,
          storySeed: state.storySeed,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "API request failed");
      }

      const data: ChatApiResponse = await res.json();

      // Handle phase transition (forward-only: never go backward)
      const currentPhaseNow = get().currentPhase;
      // R7-FIX(A3): Guard phase before accessing to prevent undefined in visitedPhases
      const nextPhase = data.phase;
      if (nextPhase && nextPhase > currentPhaseNow) {
        set({ isTransitioning: true });
        await new Promise((r) => setTimeout(r, 600));
        set((s) => ({
          currentPhase: nextPhase as 1 | 2 | 3 | 4,
          visitedPhases: s.visitedPhases.includes(nextPhase)
            ? s.visitedPhases
            : [...s.visitedPhases, nextPhase],
          turnCountInCurrentPhase: 0, // Reset turn count for new phase
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
        // P1-FIX(KR-4): Use ?? instead of || to prevent sticky premium state.
        // Only override when API explicitly returns isPremium; otherwise keep current.
        isPremiumStory: data.isPremium !== undefined ? data.isPremium : s.isPremiumStory,
      }));

      // ─── Auto-save draft after EVERY successful exchange ───
      // Saves to localStorage on every turn for BOTH guests and logged-in users.
      // This guarantees 0% chat loss on: refresh, crash, OAuth redirect, tab close.
      // (Previously only saved when isFromDraft was true — missing fresh sessions)
      if (!data.isStoryComplete) {
        get().saveDraft();
      }

      // ─── Story complete → clear draft (no longer needed) ───
      if (data.isStoryComplete) {
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        set({ isFromDraft: false });
      }

      // IN-7: Save completed story — set storySaved synchronously BEFORE async fetch to prevent race
      if (data.isStoryComplete && data.scenes && data.scenes.length > 0 && !get().storySaved && !saveInFlight) {
        saveInFlight = true; // P1-FIX(KR-3): Module-level lock in addition to state flag
            // R3-FIX: Timeout fallback — release lock after 30s to prevent permanent deadlock
            saveInFlightTimer = setTimeout(() => { saveInFlight = false; saveInFlightTimer = null; }, 30_000);
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
        } finally {
          saveInFlight = false; // P1-FIX(KR-3): Release module-level lock
            if (saveInFlightTimer) { clearTimeout(saveInFlightTimer); saveInFlightTimer = null; }
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

  sendMessageStreaming: async (text: string) => {
    const state = get();
    if (!text.trim() || state.isLoading) return;

    const userMsg: Message = {
      id: genId("user"),
      role: "user",
      content: text.trim(),
    };
    const updatedMessages = [...state.messages, userMsg];
    const newTurnCount = state.turnCountInCurrentPhase + 1;
    set({ messages: updatedMessages, isLoading: true, turnCountInCurrentPhase: newTurnCount });

    try {
      const apiMessages = updatedMessages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.content }));

      let childAge: string | undefined;
      let parentRole: string | undefined;
      let parentAge: string | undefined;
      try {
        childAge = localStorage.getItem("mamastale_child_age") || undefined;
        parentRole = localStorage.getItem("mamastale_parent_role") || undefined;
        parentAge = localStorage.getItem("mamastale_parent_age") || undefined;
      } catch {}

      const chatHeaders = await getAuthHeaders();

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: chatHeaders,
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: state.sessionId,
          childAge,
          parentRole,
          parentAge,
          currentPhase: state.currentPhase,
          turnCountInCurrentPhase: newTurnCount,
          storySeed: state.storySeed,
        }),
      });

      // If streaming endpoint fails or returns JSON (crisis), fall back
      const contentType = res.headers.get("Content-Type") || "";
      if (!res.ok || !contentType.includes("text/event-stream")) {
        // Undo the user message and turn count, then delegate to sendMessage
        set({
          messages: state.messages,
          turnCountInCurrentPhase: state.turnCountInCurrentPhase,
          isLoading: false,
        });
        return get().sendMessage(text);
      }

      // Create placeholder assistant message for streaming
      const assistantMsgId = genId("asst");
      set((s) => ({
        messages: [...s.messages, {
          id: assistantMsgId,
          role: "assistant" as const,
          content: "",
          phase: s.currentPhase,
        }],
      }));

      if (!res.body) {
        set({ isLoading: false });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: ChatStreamEvent;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === "text" && event.text) {
            assistantContent += event.text;
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: assistantContent } : m
              ),
            }));
          }

          if (event.type === "done") {
            // Handle phase transition
            const currentPhaseNow = get().currentPhase;
            // R7-FIX(A4): Guard phase before accessing to prevent undefined in visitedPhases
            const streamNextPhase = event.phase;
            if (streamNextPhase && streamNextPhase > currentPhaseNow) {
              set({ isTransitioning: true });
              await new Promise((r) => setTimeout(r, 600));
              set((s) => ({
                currentPhase: streamNextPhase as 1 | 2 | 3 | 4,
                visitedPhases: s.visitedPhases.includes(streamNextPhase)
                  ? s.visitedPhases
                  : [...s.visitedPhases, streamNextPhase],
                turnCountInCurrentPhase: 0,
              }));
              await new Promise((r) => setTimeout(r, 500));
              set({ isTransitioning: false });
            }

            // Update message with final phase tag
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, phase: event.phase || s.currentPhase } : m
              ),
              storyDone: event.isStoryComplete || s.storyDone,
              completedStoryId: event.storyId || s.completedStoryId,
              completedScenes: event.scenes && event.scenes.length > 0
                ? event.scenes
                : s.completedScenes,
              isPremiumStory: event.isPremium !== undefined ? event.isPremium : s.isPremiumStory,
            }));

            // Auto-save draft
            if (!event.isStoryComplete) {
              get().saveDraft();
            } else {
              try { localStorage.removeItem(DRAFT_KEY); } catch {}
              set({ isFromDraft: false });
            }

            // Save completed story
            if (event.isStoryComplete && event.scenes && event.scenes.length > 0 && !get().storySaved && !saveInFlight) {
              saveInFlight = true;
              // R5-1: Timeout fallback — release lock after 30s (parity with non-streaming path)
              saveInFlightTimer = setTimeout(() => { saveInFlight = false; saveInFlightTimer = null; }, 30_000);
              set({ storySaved: true });
              try {
                const authHeaders = await getAuthHeaders();
                const saveRes = await fetch("/api/stories", {
                  method: "POST",
                  headers: authHeaders,
                  body: JSON.stringify({
                    title: "나의 마음 동화",
                    scenes: event.scenes,
                    sessionId: state.sessionId || undefined,
                  }),
                });
                if (saveRes.ok) {
                  const saveData = await saveRes.json();
                  set({ storySaveError: null, completedStoryId: saveData.id || get().completedStoryId });
                } else if (saveRes.status === 401) {
                  set({ storySaved: false, storySaveError: "login_required" });
                  get().persistToStorage();
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
              } finally {
                if (saveInFlightTimer) { clearTimeout(saveInFlightTimer); saveInFlightTimer = null; }
                saveInFlight = false;
              }
            }
          }

          if (event.type === "error") {
            // Replace empty placeholder with error
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: event.error || "스트리밍 오류가 발생했어요.", isError: true }
                  : m
              ),
            }));
          }
        }
      }
    } catch (err) {
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

  // ─── Auth redirect save (STORAGE_KEY) — consumed after restore ───
  persistToStorage: () => {
    try {
      const s = get();
      const snapshot = {
        sessionId: s.sessionId,
        messages: s.messages,
        currentPhase: s.currentPhase,
        visitedPhases: s.visitedPhases,
        turnCountInCurrentPhase: s.turnCountInCurrentPhase,
        storyDone: s.storyDone,
        completedScenes: s.completedScenes,
        storySeed: s.storySeed,
        savedAt: Date.now(),
        source: "auth",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage not available
    }
  },

  // ─── Auth redirect restore — DESTRUCTIVE (deletes STORAGE_KEY after restore) ───
  restoreFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);

      if (!isValidSnapshot(snapshot)) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // 24-hour expiry for auth saves
      if (Date.now() - (snapshot.savedAt as number) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      set(snapshotToState(snapshot));
      // Auth saves are consumed (one-time use)
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
      return false;
    }
  },

  // ─── Persistent draft save (DRAFT_KEY) — survives until explicit delete ───
  saveDraft: () => {
    try {
      const s = get();
      const snapshot = {
        sessionId: s.sessionId,
        messages: s.messages,
        currentPhase: s.currentPhase,
        visitedPhases: s.visitedPhases,
        turnCountInCurrentPhase: s.turnCountInCurrentPhase,
        storyDone: s.storyDone,
        completedScenes: s.completedScenes,
        storySeed: s.storySeed,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage not available
    }
  },

  // ─── Draft restore — NON-DESTRUCTIVE (draft stays in localStorage) ───
  restoreDraft: () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);

      if (!isValidSnapshot(snapshot)) {
        localStorage.removeItem(DRAFT_KEY);
        return false;
      }

      // 30-day expiry for drafts
      if (Date.now() - (snapshot.savedAt as number) > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return false;
      }

      set({ ...snapshotToState(snapshot), isFromDraft: true });
      // NOTE: We do NOT delete DRAFT_KEY here — draft persists
      return true;
    } catch {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
      return false;
    }
  },

  // ─── getDraftInfo: checks draft first, then auth — read-only ───
  getDraftInfo: () => {
    try {
      // Check persistent draft first
      let raw = localStorage.getItem(DRAFT_KEY);
      let source = "draft";

      // Fallback to auth save
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEY);
        source = "auth";
      }

      if (!raw) return null;
      const snapshot = JSON.parse(raw);
      if (typeof snapshot !== "object" || snapshot === null || typeof snapshot.savedAt !== "number") return null;

      // CTO-FIX: Auth save expiry must match restoreFromStorage (24h), not 7d.
      // Previous 7d caused getDraftInfo to show "이어서 대화하기" card even after
      // restoreFromStorage would silently fail (>24h old), leading to dead button clicks.
      const maxAge = source === "draft"
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
      if (Date.now() - snapshot.savedAt > maxAge) {
        localStorage.removeItem(source === "draft" ? DRAFT_KEY : STORAGE_KEY);
        return null;
      }

      const userMsgCount = Array.isArray(snapshot.messages)
        ? snapshot.messages.filter((m: { role: string }) => m.role === "user").length
        : 0;
      return {
        phase: snapshot.currentPhase || 1,
        messageCount: userMsgCount,
        savedAt: snapshot.savedAt,
        source,
      };
    } catch {
      return null;
    }
  },

  // ─── Clear everything (both auth + draft) — used by explicit "삭제" button ───
  clearStorage: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  },

  // ─── Clear only the persistent draft ───
  clearDraft: () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  },

  updateScenes: (scenes: Scene[]) => {
    set({ completedScenes: scenes });
  },

  retrySaveStory: async () => {
    const state = get();
    if (state.storySaved || state.completedScenes.length === 0) return false;

    // P1-FIX(KR-3): Prevent concurrent retry attempts
    if (saveInFlight) return false;
    saveInFlight = true;

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
        // Clear auth backup since story is now safely in DB
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        // Clear draft too — story is complete
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      saveInFlight = false;
    }
  },

  // ─── Reset: clears in-memory state + auth save, but NEVER touches DRAFT_KEY ───
  reset: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    // NOTE: DRAFT_KEY is intentionally preserved — drafts survive reset
    set({
      sessionId: "",
      messages: makeInitialMessages(),
      currentPhase: 1,
      visitedPhases: [1],
      turnCountInCurrentPhase: 0,
      isLoading: false,
      isTransitioning: false,
      storyDone: false,
      completedStoryId: null,
      completedScenes: [],
      storySaved: false,
      storySaveError: null,
      isFromDraft: false,
      isPremiumStory: false,
      storySeed: {},
    });
  },
}));
