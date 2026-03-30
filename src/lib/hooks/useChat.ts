"use client";

import { create } from "zustand";
import type { Message, ChatApiResponse, ChatStreamEvent, StorySeedState } from "@/lib/types/chat";
import type { Scene } from "@/lib/types/story";
import { createClient } from "@/lib/supabase/client";
import { nameWithParticle } from "@/lib/utils/korean";
import { trackChatPhaseEnter, trackStoryComplete } from "@/lib/utils/analytics";
import { CHAT_STORAGE_KEY, CHAT_DRAFT_KEY } from "@/lib/constants/chat-storage";
import { getDraftInfo as getDraftInfoUtil } from "@/lib/utils/draft-info";

// ─── Two separate storage keys (aliased from constants for local use) ───
const STORAGE_KEY = CHAT_STORAGE_KEY;
const DRAFT_KEY = CHAT_DRAFT_KEY;

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
  } catch (e) { console.warn("[useChat] getAuthHeaders 실패", e); }
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

// Route-Hunt 9-1: Module-level AbortController for streaming/fetch cancellation on back-navigation
// Pattern copied from useTeacherStore.ts (line 87) — proven stable in production
let currentAbortController: AbortController | null = null;
let streamRafId: number = 0; // rAF handle for streaming flush cancellation

/**
 * Route-Hunt 9-1: Abort any in-flight chat request (streaming or non-streaming).
 * Called from page.tsx popstate handler when leaving chat screen.
 * cleanupAfterAbort is triggered automatically in the catch block.
 */
export function abortCurrentRequest() {
  currentAbortController?.abort();
  // Note: cleanup happens in each function's catch block (AbortError path)
}

// P1-FIX(KR-3): Module-level lock to prevent concurrent save/retry operations
// R3-FIX: Add timeout fallback to prevent permanent lock on network failure
let saveInFlight = false;
let saveInFlightTimer: ReturnType<typeof setTimeout> | null = null;
// Fix 2: Counter-based lock to prevent concurrent sendMessage + 30s timeout
let sendInFlightId = 0;
let sendInFlightTimer: ReturnType<typeof setTimeout> | null = null;
function armSendInFlight(): number {
  const id = ++sendInFlightId;
  if (sendInFlightTimer) clearTimeout(sendInFlightTimer);
  sendInFlightTimer = setTimeout(() => {
    if (sendInFlightId === id) {
      sendInFlightId = 0;
      sendInFlightTimer = null;
      console.warn("[useChat] sendInFlight 90s 타임아웃 해제");
    }
  }, 90_000);
  return id;
}
function disarmSendInFlight(id: number) {
  if (sendInFlightId === id) sendInFlightId = 0;
  if (sendInFlightTimer) { clearTimeout(sendInFlightTimer); sendInFlightTimer = null; }
}

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
  let childName = "";
  try {
    childAge = localStorage?.getItem("mamastale_child_age") || "";
    parentRole = localStorage?.getItem("mamastale_parent_role") || "";
    childName = localStorage?.getItem("mamastale_child_name") || "";
  } catch { /* SSR: localStorage unavailable — expected */ }

  const role = ROLE_TITLES[parentRole] || ROLE_TITLES["엄마"];

  // 아이 이름이 있으면 개인화된 인사: "서연이의 어머니" / 없으면 기존: "어머니"
  const greeting = childName
    ? `${nameWithParticle(childName, "이의", "의")} ${role.honorific}`
    : role.greeting;

  const ageNote = childAge && AGE_LABELS[childAge]
    ? `${AGE_LABELS[childAge]} 매일 분주하시죠.\n\n`
    : "";

  // R5: 첫 메시지 단축 (~250단어 → ~60단어)
  return `안녕하세요, ${greeting}.\n\n${ageNote}이곳은 ${role.honorific}의 이야기를 안전하게 나눌 수 있는 공간이에요. 어떤 감정이든 있는 그대로 이야기해 주셔도 괜찮습니다.\n\n오늘 ${role.honorific}의 마음은 어떠신가요?`;
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
    // Bug Bounty Fix 1-2: Also skip if restored from draft (prevents race between
    // restoreDraft setting sessionId and ChatContainer calling initSession on mount)
    if (!get().sessionId && !get().isFromDraft) {
      // Rebuild initial messages to pick up latest localStorage values
      // (e.g. child age set during onboarding AFTER Zustand module-level init)
      set({ sessionId, messages: makeInitialMessages() });
      trackChatPhaseEnter(1); // E2E: Phase 1 퍼널 트래킹
    }
  },

  sendMessage: async (text: string) => {
    const state = get();
    // Fix 2: Counter-based lock prevents concurrent sends (double-click, fast Enter)
    // R4: Block sends during phase transition
    if (!text.trim() || state.isLoading || state.isTransitioning || sendInFlightId > 0) return;
    const reqId = armSendInFlight();
    // Y3-FIX: Track response status outside try for catch-block access
    let resStatus = 0;

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
      } catch (e) { console.warn("[useChat] sendMessage localStorage 접근 실패", e); }

      // CTO-FIX: Include Bearer token for premium detection in WebView/mobile
      const chatHeaders = await getAuthHeaders();

      // ROUND1-FIX: 90s timeout to prevent infinite hang when Claude API is slow
      // Route-Hunt 9-1: Use module-level controller for external abort support
      currentAbortController = new AbortController();
      const timeoutId = setTimeout(() => {
        // Mark as timeout abort (vs manual abort from popstate)
        if (currentAbortController) currentAbortController.abort();
      }, 90_000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: chatHeaders,
        signal: currentAbortController.signal,
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
      resStatus = res.status; // Y3-FIX: Preserve status for catch-block rollback

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "API request failed");
      }

      const data: ChatApiResponse = await res.json();

      // Handle phase transition (forward-only: never go backward)
      const currentPhaseNow = get().currentPhase;
      // R7-FIX(A3): Guard phase before accessing to prevent undefined in visitedPhases
      const nextPhase = data.phase;
      if (nextPhase && nextPhase > currentPhaseNow) {
        trackChatPhaseEnter(nextPhase); // C1: 퍼널 트래킹
        set({ isTransitioning: true });
        await new Promise((r) => setTimeout(r, 150)); // Fix 2-8: faster phase transition
        set((s) => ({
          currentPhase: nextPhase as 1 | 2 | 3 | 4,
          visitedPhases: s.visitedPhases.includes(nextPhase)
            ? s.visitedPhases
            : [...s.visitedPhases, nextPhase],
          turnCountInCurrentPhase: 0, // Reset turn count for new phase
        }));
        await new Promise((r) => setTimeout(r, 150)); // Fix 2-8: faster phase transition
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
        // Sprint 2-C: Capture AI-suggested tags from story completion
        storySeed: data.suggestedTags && data.suggestedTags.length > 0
          ? { ...s.storySeed, suggestedTags: data.suggestedTags }
          : s.storySeed,
      }));

      // ─── Auto-save draft after EVERY successful exchange ───
      // Saves to localStorage on every turn for BOTH guests and logged-in users.
      // This guarantees 0% chat loss on: refresh, crash, OAuth redirect, tab close.
      // (Previously only saved when isFromDraft was true — missing fresh sessions)
      if (!data.isStoryComplete) {
        try { get().saveDraft(); } catch (e) { console.warn("[useChat] saveDraft 실패", e); }
      }

      // ─── Story complete → clear draft (no longer needed) ───
      if (data.isStoryComplete) {
        trackStoryComplete(); // C1: 퍼널 트래킹
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        set({ isFromDraft: false });
      }

      // IN-7: Save completed story — set storySaved synchronously BEFORE async fetch to prevent race
      if (data.isStoryComplete && data.scenes && data.scenes.length > 0 && !get().storySaved && !saveInFlight) {
        saveInFlight = true; // P1-FIX(KR-3): Module-level lock in addition to state flag
            // R3-FIX: Timeout fallback — release lock after 30s to prevent permanent deadlock
            if (saveInFlightTimer) clearTimeout(saveInFlightTimer);
            // V5-FIX #17 + Bug Bounty Fix 2-7: On timeout, set "timeout" error instead of
            // resetting storySaved (which could mark an already-saved story as unsaved).
            saveInFlightTimer = setTimeout(() => { saveInFlight = false; saveInFlightTimer = null; set({ storySaveError: "timeout" }); }, 30_000);
        set({ storySaved: true }); // Synchronous mutex — prevents concurrent save attempts
        try {
          const storyTitle = data.title || "나의 마음 동화";
          const authHeaders = await getAuthHeaders();
          const saveRes = await fetch("/api/stories", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              title: storyTitle,
              scenes: data.scenes,
              sessionId: state.sessionId || undefined,
            }),
            signal: AbortSignal.timeout(35_000), // AI 표지 생성 포함 30초 + 여유 5초
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
        } catch (e) {
          console.warn("[useChat] 스토리 저장 실패", e);
          set({ storySaved: false, storySaveError: "save_failed" });
          get().persistToStorage();
        } finally {
          saveInFlight = false; // P1-FIX(KR-3): Release module-level lock
            if (saveInFlightTimer) { clearTimeout(saveInFlightTimer); saveInFlightTimer = null; }
        }
      }
    } catch (err) {
      // Route-Hunt 9-1: Manual abort (popstate back-navigation) — rollback silently, no error message
      if (err instanceof DOMException && err.name === "AbortError") {
        // Rollback: remove user message + turn count (assistant placeholder not added in non-streaming)
        set((s) => ({
          messages: s.messages.filter(m => m.id !== userMsg.id),
          turnCountInCurrentPhase: Math.max(0, s.turnCountInCurrentPhase - 1),
          isLoading: false,
        }));
        disarmSendInFlight(reqId);
        currentAbortController = null;
        return; // Silent abort — no error message shown
      }
      // Y3-FIX: Rollback user message + turn count on auth errors (pattern matches sendMessageStreaming:460-466)
      // BugBounty-FIX: Use functional updater to remove only the failed message (not stale snapshot)
      if (resStatus === 401 || resStatus === 403) {
        set((s) => ({
          messages: s.messages.slice(0, -1),
          turnCountInCurrentPhase: Math.max(0, s.turnCountInCurrentPhase - 1),
        }));
        get().saveDraft(); // Force-save clean state to prevent draft corruption
      }
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
      disarmSendInFlight(reqId); // Fix 2: Release counter-based lock
      currentAbortController = null; // Route-Hunt 9-1: Clear controller reference
    }
  },

  sendMessageStreaming: async (text: string) => {
    const state = get();
    // Fix 2: Counter-based lock prevents concurrent sends
    // R4: Block sends during phase transition
    if (!text.trim() || state.isLoading || state.isTransitioning || sendInFlightId > 0) return;
    const reqId = armSendInFlight();

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
      } catch (e) { console.warn("[useChat] sendMessageStreaming localStorage 접근 실패", e); }

      const chatHeaders = await getAuthHeaders();

      // Route-Hunt 9-1: Module-level AbortController for back-navigation abort
      currentAbortController = new AbortController();

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: chatHeaders,
        signal: currentAbortController.signal,
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
      streamRafId = 0; // Route-Hunt 9-1: Module-level rAF handle for abort cleanup

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: ChatStreamEvent;
          try { event = JSON.parse(line.slice(6)); } catch (e) { console.warn("[useChat] SSE JSON 파싱 실패", e); continue; }

          // E2E: rAF batching — accumulate chunks, flush once per frame
          // Bug Bounty Fix 2-15: Use rAF in foreground, setTimeout in background tab.
          // rAF is paused when tab is inactive, causing streaming to freeze until tab refocus.
          if (event.type === "text" && event.text) {
            assistantContent += event.text;
            if (!streamRafId) {
              const flush = () => {
                streamRafId = 0;
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                  ),
                }));
              };
              streamRafId = document.hidden
                ? (setTimeout(flush, 16) as unknown as number)
                : requestAnimationFrame(flush);
            }
          }

          // P1-4: Append warm redirect message when medical advice is detected
          if (event.type === "safety_redirect" && event.message) {
            // E2E: flush pending rAF before safety message
            if (streamRafId) { cancelAnimationFrame(streamRafId); streamRafId = 0; }
            assistantContent += "\n\n" + event.message;
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: assistantContent } : m
              ),
            }));
          }

          if (event.type === "done") {
            // E2E: flush pending rAF before done processing (레이스 컨디션 방지)
            if (streamRafId) {
              cancelAnimationFrame(streamRafId);
              streamRafId = 0;
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                ),
              }));
            }
            // Handle phase transition
            const currentPhaseNow = get().currentPhase;
            // R7-FIX(A4): Guard phase before accessing to prevent undefined in visitedPhases
            const streamNextPhase = event.phase;
            if (streamNextPhase && streamNextPhase > currentPhaseNow) {
              trackChatPhaseEnter(streamNextPhase); // C1: 퍼널 트래킹
              set({ isTransitioning: true });
              await new Promise((r) => setTimeout(r, 150)); // Fix 2-8: faster phase transition
              set((s) => ({
                currentPhase: streamNextPhase as 1 | 2 | 3 | 4,
                visitedPhases: s.visitedPhases.includes(streamNextPhase)
                  ? s.visitedPhases
                  : [...s.visitedPhases, streamNextPhase],
                turnCountInCurrentPhase: 0,
              }));
              await new Promise((r) => setTimeout(r, 150)); // Fix 2-8: faster phase transition
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
              // Sprint 2-C: Capture AI-suggested tags from streaming completion
              storySeed: event.suggestedTags && event.suggestedTags.length > 0
                ? { ...s.storySeed, suggestedTags: event.suggestedTags }
                : s.storySeed,
            }));

            // Auto-save draft
            if (!event.isStoryComplete) {
              try { get().saveDraft(); } catch (e) { console.warn("[useChat] saveDraft 실패", e); }
            } else {
              trackStoryComplete(); // C1: 퍼널 트래킹
              try { localStorage.removeItem(DRAFT_KEY); } catch {}
              set({ isFromDraft: false });
            }

            // Save completed story
            if (event.isStoryComplete && event.scenes && event.scenes.length > 0 && !get().storySaved && !saveInFlight) {
              saveInFlight = true;
              // R5-1: Timeout fallback — release lock after 30s (parity with non-streaming path)
              if (saveInFlightTimer) clearTimeout(saveInFlightTimer);
              saveInFlightTimer = setTimeout(() => { saveInFlight = false; saveInFlightTimer = null; }, 30_000);
              set({ storySaved: true });
              try {
                const authHeaders = await getAuthHeaders();
                const saveRes = await fetch("/api/stories", {
                  method: "POST",
                  headers: authHeaders,
                  body: JSON.stringify({
                    title: event.title || "나의 마음 동화",
                    scenes: event.scenes,
                    sessionId: state.sessionId || undefined,
                  }),
                  signal: AbortSignal.timeout(35_000), // AI 표지 생성 포함
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
              } catch (e) {
                console.warn("[useChat] 스트리밍 스토리 저장 실패", e);
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
      // Route-Hunt 9-1: Manual abort (popstate back-navigation) — rollback silently
      if (err instanceof DOMException && err.name === "AbortError") {
        // Cancel pending rAF flush
        if (streamRafId) { cancelAnimationFrame(streamRafId); streamRafId = 0; }
        // Rollback: remove incomplete assistant message + user message + turn count
        // (7pass 2-1+3-2: prevent half-finished AI message in therapeutic context)
        set((s) => {
          const msgs = s.messages;
          // If last message is the empty/partial assistant placeholder, remove it + user msg
          if (msgs.length >= 2 && msgs[msgs.length - 1]?.role === "assistant") {
            return {
              messages: msgs.slice(0, -2),
              turnCountInCurrentPhase: Math.max(0, s.turnCountInCurrentPhase - 1),
              isLoading: false,
            };
          }
          // If assistant not yet added, just remove user message
          return {
            messages: msgs.filter(m => m.id !== userMsg.id),
            turnCountInCurrentPhase: Math.max(0, s.turnCountInCurrentPhase - 1),
            isLoading: false,
          };
        });
        disarmSendInFlight(reqId);
        currentAbortController = null;
        return; // Silent abort — no error message shown
      }
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
      disarmSendInFlight(reqId); // Fix 2: Release counter-based lock
      currentAbortController = null; // Route-Hunt 9-1: Clear controller reference
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
      // Route-Hunt 9-2: 동기화 — draft도 함께 갱신하여 두 키 간 상태 불일치 방지
      get().saveDraft();
    } catch (e) {
      console.warn("[useChat] persistToStorage 실패", e);
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

      // Route-Hunt 9-2: draft가 auth save보다 새로우면 draft 우선
      try {
        const draftRaw = localStorage.getItem(DRAFT_KEY);
        if (draftRaw) {
          const draftSnap = JSON.parse(draftRaw);
          if (isValidSnapshot(draftSnap) && (draftSnap.savedAt as number) > (snapshot.savedAt as number)) {
            set({ ...snapshotToState(draftSnap), isFromDraft: true });
            localStorage.removeItem(STORAGE_KEY);
            return true;
          }
        }
      } catch { /* draft 비교 실패 시 auth save 사용 */ }

      set(snapshotToState(snapshot));
      // Auth saves are consumed (one-time use)
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.warn("[useChat] restoreFromStorage 실패", e);
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
    } catch (e) {
      console.warn("[useChat] saveDraft 실패", e);
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
    } catch (e) {
      console.warn("[useChat] restoreDraft 실패", e);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
      return false;
    }
  },

  // ─── getDraftInfo: delegates to lightweight utility (3-2 extraction) ───
  getDraftInfo: () => getDraftInfoUtil(),

  // ─── Clear everything (both auth + draft + onboarding) — used by explicit "삭제" button ───
  clearStorage: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    // B2: 온보딩 키 정리 — 새 채팅 시 이전 아이 이름/연령 잔류 방지
    try { localStorage.removeItem("mamastale_child_name"); } catch {}
    try { localStorage.removeItem("mamastale_child_age"); } catch {}
    try { localStorage.removeItem("mamastale_parent_role"); } catch {}
    try { localStorage.removeItem("mamastale_onboarding_done"); } catch {}
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
    // V5-FIX #17: Timeout protection for retrySaveStory (same 30s deadlock prevention)
    if (saveInFlightTimer) clearTimeout(saveInFlightTimer);
    saveInFlightTimer = setTimeout(() => { saveInFlight = false; saveInFlightTimer = null; }, 90_000);

    // H14-FIX: Exponential backoff with 3 retries (was single attempt)
    const MAX_RETRIES = 3;
    const BACKOFF_BASE_MS = 1_000; // 1s, 2s, 4s

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // V5-FIX #28: Fresh auth headers (token may have refreshed since first attempt)
          const authHeaders = await getAuthHeaders();
          const res = await fetch("/api/stories", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              title: "나의 마음 동화",
              scenes: state.completedScenes,
              sessionId: state.sessionId || undefined,
            }),
            signal: AbortSignal.timeout(35_000), // AI 표지 생성 포함
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

          // 4xx errors (except 429) are not retryable
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            console.warn(`[useChat] retrySaveStory non-retryable ${res.status}`);
            return false;
          }

          // Retryable error — wait with exponential backoff
          if (attempt < MAX_RETRIES - 1) {
            const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
            console.warn(`[useChat] retrySaveStory attempt ${attempt + 1}/${MAX_RETRIES} failed (${res.status}), retrying in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
          }
        } catch (e) {
          // Network error — retry with backoff
          if (attempt < MAX_RETRIES - 1) {
            const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
            console.warn(`[useChat] retrySaveStory attempt ${attempt + 1}/${MAX_RETRIES} network error, retrying in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            console.warn("[useChat] retrySaveStory 실패 (all retries exhausted)", e);
          }
        }
      }
      return false;
    } finally {
      saveInFlight = false;
      // V5-FIX #17: Clear timeout timer on completion
      if (saveInFlightTimer) { clearTimeout(saveInFlightTimer); saveInFlightTimer = null; }
    }
  },

  // ─── Reset: clears in-memory state + auth save + onboarding, but NEVER touches DRAFT_KEY ───
  reset: () => {
    // Route-Hunt 9-1: Abort any in-flight request on reset (TeacherStore pattern)
    currentAbortController?.abort();
    currentAbortController = null;
    if (streamRafId) { cancelAnimationFrame(streamRafId); streamRafId = 0; }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    // B2: 온보딩 키 정리 — 새 채팅 시 이전 아이 이름/연령 잔류 방지
    try { localStorage.removeItem("mamastale_child_name"); } catch {}
    try { localStorage.removeItem("mamastale_child_age"); } catch {}
    try { localStorage.removeItem("mamastale_parent_role"); } catch {}
    try { localStorage.removeItem("mamastale_onboarding_done"); } catch {}
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
