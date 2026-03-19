import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock browser APIs before importing useChat ───

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { for (const k in localStorageStore) delete localStorageStore[k]; }),
};
vi.stubGlobal("localStorage", localStorageMock);

// Mock Supabase client (used by getAuthHeaders)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

// Mock nameWithParticle (Korean grammar helper)
vi.mock("@/lib/utils/korean", () => ({
  nameWithParticle: (name: string, withBatchim: string) =>
    `${name}${withBatchim}`,
}));

// Mock analytics (used by useChat for phase/story tracking)
vi.mock("@/lib/utils/analytics", () => ({
  trackChatPhaseEnter: vi.fn(),
  trackStoryComplete: vi.fn(),
}));

// ─── Now import the store ───
import { useChatStore } from "./useChat";

// ─── Helpers ───

/** Reset the Zustand store between tests. Also resets module-level sendInFlight by calling
 *  sendMessage with empty text (which returns immediately) — this doesn't affect lock state.
 *  The real reset happens because each test's finally block runs properly. */
function resetStore() {
  useChatStore.setState({
    sessionId: "test-session",
    messages: [],
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
}

/** Create a mock fetch response for successful API call */
function mockFetchOk(data: Record<string, unknown>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    headers: new Headers({ "Content-Type": "application/json" }),
  });
}

function mockFetchError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    headers: new Headers({ "Content-Type": "application/json" }),
  });
}

// ────────────────────────────────────────────────────────
// Test Suite: sendMessage lock mechanism (sendInFlight)
// ────────────────────────────────────────────────────────

describe("useChatStore — sendMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set isLoading during API call and release after", async () => {
    const fetchMock = mockFetchOk({
      content: "AI 응답입니다.",
      phase: 1,
      isStoryComplete: false,
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = useChatStore.getState().sendMessage("안녕하세요");

    // isLoading should be true immediately after call
    expect(useChatStore.getState().isLoading).toBe(true);

    await promise;

    // isLoading should be false after completion
    expect(useChatStore.getState().isLoading).toBe(false);

    // Should have user message + assistant message (no initial message since we reset to [])
    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("안녕하세요");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content).toBe("AI 응답입니다.");
  });

  it("should reject concurrent calls (second call is silently dropped)", async () => {
    // Slow fetch that resolves manually
    let resolveFirst!: (value: unknown) => void;
    const slowFetch = vi.fn().mockImplementation(() =>
      new Promise((resolve) => { resolveFirst = resolve; })
    );
    vi.stubGlobal("fetch", slowFetch);

    // First call — starts API request
    const first = useChatStore.getState().sendMessage("첫 번째 메시지");

    // Wait for microtask to allow getAuthHeaders() to resolve
    await vi.advanceTimersByTimeAsync(0);

    // Second call — should be rejected (sendInFlight is true)
    const second = useChatStore.getState().sendMessage("두 번째 메시지");

    // Only one fetch call should have been made
    expect(slowFetch).toHaveBeenCalledTimes(1);

    // Resolve the first call
    resolveFirst({
      ok: true,
      json: () => Promise.resolve({ content: "응답", phase: 1, isStoryComplete: false }),
      headers: new Headers({ "Content-Type": "application/json" }),
    });

    await first;
    await second;

    // Only one user message should exist
    const userMessages = useChatStore.getState().messages.filter((m) => m.role === "user");
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].content).toBe("첫 번째 메시지");
  });

  it("should release lock on API error (finally block)", async () => {
    const fetchMock = mockFetchError(500, "Internal Server Error");
    vi.stubGlobal("fetch", fetchMock);

    await useChatStore.getState().sendMessage("에러 테스트");

    // isLoading should be false
    expect(useChatStore.getState().isLoading).toBe(false);

    // Error message should be added
    const messages = useChatStore.getState().messages;
    const errorMsgs = messages.filter((m) => m.isError);
    expect(errorMsgs.length).toBe(1);

    // Lock should be released — next message should go through
    const fetchMock2 = mockFetchOk({
      content: "복구 응답",
      phase: 1,
      isStoryComplete: false,
    });
    vi.stubGlobal("fetch", fetchMock2);

    await useChatStore.getState().sendMessage("복구 메시지");

    expect(fetchMock2).toHaveBeenCalledTimes(1);
  });

  it("should reject empty or whitespace-only messages", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await useChatStore.getState().sendMessage("");
    await useChatStore.getState().sendMessage("   ");
    await useChatStore.getState().sendMessage("\n\t");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it("should reject when isLoading is already true", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    useChatStore.setState({ isLoading: true });

    await useChatStore.getState().sendMessage("로딩 중 전송");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should increment turnCountInCurrentPhase on send", async () => {
    const fetchMock = mockFetchOk({
      content: "응답",
      phase: 1,
      isStoryComplete: false,
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(useChatStore.getState().turnCountInCurrentPhase).toBe(0);

    await useChatStore.getState().sendMessage("첫 턴");
    expect(useChatStore.getState().turnCountInCurrentPhase).toBe(1);

    // Need fresh mock for second call
    vi.stubGlobal("fetch", mockFetchOk({
      content: "응답2",
      phase: 1,
      isStoryComplete: false,
    }));

    await useChatStore.getState().sendMessage("두 번째 턴");
    expect(useChatStore.getState().turnCountInCurrentPhase).toBe(2);
  });

  it("should handle phase transition (forward only)", async () => {
    const fetchMock = mockFetchOk({
      content: "2단계로 넘어갑니다.",
      phase: 2,
      isStoryComplete: false,
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(useChatStore.getState().currentPhase).toBe(1);

    const promise = useChatStore.getState().sendMessage("단계 전환 테스트");

    // Advance past the phase transition timeouts (600ms + 500ms)
    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(useChatStore.getState().currentPhase).toBe(2);
    expect(useChatStore.getState().visitedPhases).toContain(2);
    expect(useChatStore.getState().turnCountInCurrentPhase).toBe(0);
  });

  it("should NOT transition backward (phase 2 → 1)", async () => {
    useChatStore.setState({ currentPhase: 2, visitedPhases: [1, 2] });

    const fetchMock = mockFetchOk({
      content: "응답",
      phase: 1, // backward — should be ignored
      isStoryComplete: false,
    });
    vi.stubGlobal("fetch", fetchMock);

    await useChatStore.getState().sendMessage("역방향 테스트");

    expect(useChatStore.getState().currentPhase).toBe(2);
  });

  it("should handle fetch network failure gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Failed to fetch"))
    );

    await useChatStore.getState().sendMessage("네트워크 실패");

    expect(useChatStore.getState().isLoading).toBe(false);

    // Error message should be Korean-friendly (not raw "Failed to fetch")
    const errorMsg = useChatStore.getState().messages.find((m) => m.isError);
    expect(errorMsg).toBeDefined();
    expect(errorMsg!.content).toMatch(/네트워크/);

    // Lock should be released — next call should work
    vi.stubGlobal("fetch", mockFetchOk({
      content: "복구됨",
      phase: 1,
      isStoryComplete: false,
    }));

    await useChatStore.getState().sendMessage("복구");
    const userMsgs = useChatStore.getState().messages.filter(
      (m) => m.role === "user" && !m.isError
    );
    expect(userMsgs.length).toBe(2);
  });
});

// ────────────────────────────────────────────────────────
// Test Suite: initSession
// ────────────────────────────────────────────────────────

describe("useChatStore — initSession", () => {
  beforeEach(() => {
    resetStore();
    useChatStore.setState({ sessionId: "" }); // Clear for initSession tests
  });

  it("should set sessionId on first call", () => {
    useChatStore.getState().initSession("session-abc");
    expect(useChatStore.getState().sessionId).toBe("session-abc");
  });

  it("should NOT overwrite existing sessionId (LOW-12 fix)", () => {
    useChatStore.getState().initSession("session-1");
    useChatStore.getState().initSession("session-2");
    expect(useChatStore.getState().sessionId).toBe("session-1");
  });

  it("should rebuild initial messages with localStorage values", () => {
    localStorageStore["mamastale_parent_role"] = "아빠";
    useChatStore.getState().initSession("session-parent");

    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].content).toContain("아버지");
  });
});

// ────────────────────────────────────────────────────────
// Test Suite: Y3 — sendMessage auth error rollback
// ────────────────────────────────────────────────────────

describe("useChatStore — sendMessage error rollback (Y3)", () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it("should rollback user message and turn count on 401 auth error", async () => {
    const initialMessages = useChatStore.getState().messages;
    const initialTurnCount = useChatStore.getState().turnCountInCurrentPhase;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "로그인이 필요합니다." }),
      headers: new Headers({ "Content-Type": "application/json" }),
    }));

    await useChatStore.getState().sendMessage("테스트 메시지");

    // User message should be rolled back (only initial + error message remain)
    const messages = useChatStore.getState().messages;
    const userMsgs = messages.filter(m => m.role === "user");
    expect(userMsgs.length).toBe(0); // No user messages — rolled back
    expect(useChatStore.getState().turnCountInCurrentPhase).toBe(initialTurnCount);

    // Error message should still be added
    const errorMsgs = messages.filter(m => m.isError);
    expect(errorMsgs.length).toBe(1);
  });

  it("should keep user message on 500 server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal Server Error" }),
      headers: new Headers({ "Content-Type": "application/json" }),
    }));

    await useChatStore.getState().sendMessage("서버 에러 테스트");

    // User message should be kept (not rolled back)
    const messages = useChatStore.getState().messages;
    const userMsgs = messages.filter(m => m.role === "user");
    expect(userMsgs.length).toBe(1); // User message preserved
    expect(userMsgs[0].content).toBe("서버 에러 테스트");

    // Error message should also be added
    const errorMsgs = messages.filter(m => m.isError);
    expect(errorMsgs.length).toBe(1);
  });
});
