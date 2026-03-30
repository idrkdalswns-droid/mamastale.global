"use client";

import { create } from "zustand";
import type {
  TeacherPhase,
  TeacherScreenState,
  TeacherOnboarding,
  TeacherMessage,
  TeacherStory,
  TeacherSession,
} from "@/lib/types/teacher";

const STORAGE_KEY = "mamastale_teacher_session";

interface TeacherState {
  // Session
  sessionId: string | null;
  expiresAt: string | null;
  kindergartenName: string | null;
  teacherCode: string | null;

  // Chat
  messages: TeacherMessage[];
  currentPhase: TeacherPhase;
  turnCount: number;
  isLoading: boolean;
  isGenerating: boolean;

  // Onboarding
  onboarding: TeacherOnboarding | null;

  // Generated story
  generatedStory: TeacherStory | null;

  // Screen
  screenState: TeacherScreenState;

  // Internal flags
  _generateReady: boolean;
  /** Route-Hunt 3-3: Set to true when API returns 401 (auth session expired) */
  sessionExpired: boolean;

  // Actions
  setScreenState: (state: TeacherScreenState) => void;
  setSession: (session: {
    sessionId: string;
    expiresAt: string;
    kindergartenName: string;
    currentPhase?: TeacherPhase;
    turnCount?: number;
    teacherCode?: string;
  }) => void;
  setOnboarding: (onboarding: TeacherOnboarding) => void;
  addMessage: (message: TeacherMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setPhase: (phase: TeacherPhase) => void;
  setTurnCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setGeneratedStory: (story: TeacherStory | null) => void;
  restoreSession: (session: TeacherSession, messages: TeacherMessage[]) => void;
  reset: () => void;
  addSystemGreeting: (content: string) => void;
  persistToStorage: () => void;
  restoreFromStorage: () => boolean;
  cancelStreaming: () => void;
  sendMessageStreaming: (text: string, forceGenerate?: boolean) => Promise<boolean>;
}

const initialState = {
  sessionId: null as string | null,
  expiresAt: null as string | null,
  kindergartenName: null as string | null,
  teacherCode: null as string | null,
  messages: [] as TeacherMessage[],
  currentPhase: "A" as TeacherPhase,
  turnCount: 0,
  isLoading: false,
  isGenerating: false,
  onboarding: null as TeacherOnboarding | null,
  generatedStory: null as TeacherStory | null,
  screenState: "CODE_ENTRY" as TeacherScreenState,
  _generateReady: false,
  sessionExpired: false,
};

// Module-level mutex to prevent concurrent sends
let sendInFlight = false;
// Module-level AbortController for stream cancellation
let currentAbort: AbortController | null = null;

export const useTeacherStore = create<TeacherState>((set, get) => ({
  ...initialState,

  setScreenState: (screenState) => set({ screenState }),

  setSession: ({ sessionId, expiresAt, kindergartenName, currentPhase, turnCount, teacherCode }) =>
    set({
      sessionId,
      expiresAt,
      kindergartenName,
      currentPhase: currentPhase || "A",
      turnCount: turnCount || 0,
      ...(teacherCode ? { teacherCode } : {}),
    }),

  setOnboarding: (onboarding) => set({ onboarding }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
        msgs[lastIdx] = { ...msgs[lastIdx], content };
      }
      return { messages: msgs };
    }),

  setPhase: (phase) => set({ currentPhase: phase }),
  setTurnCount: (count) => set({ turnCount: count }),
  setLoading: (loading) => set({ isLoading: loading }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  setGeneratedStory: (story) => set({ generatedStory: story }),

  restoreSession: (session, messages) =>
    set({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      currentPhase: session.currentPhase,
      turnCount: session.turnCount,
      onboarding: session.onboarding,
      messages,
      // screenState는 호출자가 명시적으로 설정 (경쟁 조건 방지)
    }),

  // v1.22.1: AI 첫 채팅 메시지로 greeting 추가 (StrictMode 중복 방지)
  addSystemGreeting: (content: string) => {
    if (get().messages.length > 0) return;
    set(() => ({
      messages: [{
        id: `greeting-${Date.now()}`,
        role: "assistant" as const,
        content,
        phase: get().currentPhase,
      }],
    }));
  },

  // R5: Cancel ongoing streaming (e.g. on component unmount)
  cancelStreaming: () => {
    currentAbort?.abort();
  },

  reset: () => {
    currentAbort?.abort();
    set({ ...initialState });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  },

  persistToStorage: () => {
    try {
      const state = get();
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId: state.sessionId,
          currentPhase: state.currentPhase,
          turnCount: state.turnCount,
          screenState: state.screenState,
          teacherCode: state.teacherCode,
        })
      );
    } catch { /* ignore */ }
  },

  restoreFromStorage: () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.sessionId) {
        // Route-Hunt 4-2: 만료된 세션 복원 방지
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          sessionStorage.removeItem(STORAGE_KEY);
          return false;
        }
        set({
          sessionId: data.sessionId,
          currentPhase: data.currentPhase || "A",
          turnCount: data.turnCount || 0,
          screenState: data.screenState || "CHAT",
          teacherCode: data.teacherCode || null,
        });
        return true;
      }
    } catch { /* ignore */ }
    return false;
  },

  sendMessageStreaming: async (text: string, forceGenerate?: boolean): Promise<boolean> => {
    if (sendInFlight) return false;
    sendInFlight = true;

    const state = get();
    if (!state.sessionId) {
      sendInFlight = false;
      return false;
    }

    // 사용자 메시지 추가
    const userMessage: TeacherMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      phase: state.currentPhase,
    };
    set((s) => ({
      messages: [...s.messages, userMessage],
      isLoading: true,
    }));

    // 빈 어시스턴트 메시지 추가 (스트리밍 대상)
    const assistantMessage: TeacherMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      phase: state.currentPhase,
    };
    set((s) => ({
      messages: [...s.messages, assistantMessage],
    }));

    currentAbort = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      timeoutId = setTimeout(() => currentAbort?.abort(), 60_000);

      const res = await fetch("/api/teacher/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          message: text,
          ...(forceGenerate ? { forceGenerate: true } : {}),
        }),
        signal: currentAbort.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Route-Hunt 3-3: 401 auth session expired → set flag + return silently
        // (7pass 2-3: throw 제거 → finally 블록 정상 실행 보장)
        if (res.status === 401) {
          currentAbort = null;
          sendInFlight = false;
          set({ sessionExpired: true, isLoading: false });
          return false;
        }
        const apiError = (errorData as { error?: string }).error;
        const isKorean = apiError && /[가-힣]/.test(apiError);
        throw new Error(
          isKorean ? apiError : "일시적인 오류가 발생했어요. 다시 시도해 주세요."
        );
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "text" && event.text) {
              fullText += event.text;
              // [GENERATE_READY] 태그는 UI에서 제거
              const displayText = fullText.replace(/\[GENERATE_READY\]/g, "").trim();
              get().updateLastAssistantMessage(displayText);
            } else if (event.type === "done") {
              if (event.phase) {
                set({ currentPhase: event.phase });
              }
              if (typeof event.turnCount === "number") {
                set({ turnCount: event.turnCount });
              }
              // 10턴 자동생성 플래그 저장
              if (event.generateReady) {
                set({ _generateReady: true });
              }
            } else if (event.type === "error") {
              throw new Error(event.message || "스트리밍 오류");
            }
          } catch (parseErr) {
            // JSON 파싱 실패는 무시 (incomplete chunk)
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
      return true;
    } catch (err) {
      // AbortError — 네트워크 끊김 피드백 표시
      if (err instanceof DOMException && err.name === "AbortError") {
        set((s) => {
          const msgs = [...s.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
            msgs[lastIdx] = {
              ...msgs[lastIdx],
              content: "연결이 끊겼어요. 다시 보내주세요.",
              isError: true,
            };
          }
          return { messages: msgs };
        });
        return false;
      }
      // 에러 메시지로 교체
      set((s) => {
        const msgs = [...s.messages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content:
              err instanceof Error
                ? err.message
                : "응답 중 오류가 발생했어요. 다시 시도해 주세요.",
            isError: true,
          };
        }
        return { messages: msgs };
      });
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      currentAbort = null;
      set({ isLoading: false });
      sendInFlight = false;
      get().persistToStorage();
    }
  },
}));
