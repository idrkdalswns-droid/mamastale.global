import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearAllUserData } from "./useAuth";
import { abortCurrentRequest } from "./useChat";

// ─── localStorage mock ───
function createLocalStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() { return store.size; },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    // Needed for Object.keys() iteration in clearAllUserData
    [Symbol.iterator]: function* () { yield* store.keys(); },
  };
}

// Override Object.keys to work with our mock
function createStorageWithKeys(initial: Record<string, string> = {}) {
  const store = { ...initial };
  const mock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
  // Make Object.keys() work on the mock by copying initial keys as own properties
  Object.keys(initial).forEach(k => {
    Object.defineProperty(mock, k, {
      configurable: true,
      enumerable: true,
      get: () => store[k],
    });
  });
  return mock;
}

// ─── sessionStorage mock ───
function createSessionStorageMock() {
  return {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(() => null),
  };
}

// Mock supabase client (required by useAuth module)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Mock analytics (required by useChat module)
vi.mock("@/lib/utils/analytics", () => ({
  trackChatPhaseEnter: vi.fn(),
  trackStoryComplete: vi.fn(),
  trackScreenView: vi.fn(),
}));

// Mock korean util (required by useChat module)
vi.mock("@/lib/utils/korean", () => ({
  nameWithParticle: vi.fn((name: string) => name),
}));

describe("clearAllUserData", () => {
  let sessionStorageMock: ReturnType<typeof createSessionStorageMock>;

  beforeEach(() => {
    sessionStorageMock = createSessionStorageMock();
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should remove all mamastale_ prefixed keys from localStorage", () => {
    const lsMock = createStorageWithKeys({
      mamastale_chat_draft: '{"data":"test"}',
      mamastale_chat_state: '{"data":"test2"}',
      mamastale_child_age: "3-5",
      other_key: "keep_me",
    });
    vi.stubGlobal("localStorage", lsMock);

    clearAllUserData();

    expect(lsMock.removeItem).toHaveBeenCalledWith("mamastale_chat_draft");
    expect(lsMock.removeItem).toHaveBeenCalledWith("mamastale_chat_state");
    expect(lsMock.removeItem).toHaveBeenCalledWith("mamastale_child_age");
    expect(lsMock.removeItem).not.toHaveBeenCalledWith("other_key");
  });

  it("should remove mamastale- (hyphen) prefixed keys from localStorage", () => {
    const lsMock = createStorageWithKeys({
      "mamastale-font-size": "large",
      "mamastale-theme": "dark",
      unrelated_key: "keep",
    });
    vi.stubGlobal("localStorage", lsMock);

    clearAllUserData();

    expect(lsMock.removeItem).toHaveBeenCalledWith("mamastale-font-size");
    expect(lsMock.removeItem).toHaveBeenCalledWith("mamastale-theme");
    expect(lsMock.removeItem).not.toHaveBeenCalledWith("unrelated_key");
  });

  it("should preserve non-mamastale keys", () => {
    const lsMock = createStorageWithKeys({
      sb_token: "abc123",
      theme: "dark",
      mamastale_draft: "data",
    });
    vi.stubGlobal("localStorage", lsMock);

    clearAllUserData();

    expect(lsMock.removeItem).toHaveBeenCalledTimes(1);
    expect(lsMock.removeItem).toHaveBeenCalledWith("mamastale_draft");
  });

  it("should call sessionStorage.clear()", () => {
    const lsMock = createStorageWithKeys({});
    vi.stubGlobal("localStorage", lsMock);

    clearAllUserData();

    expect(sessionStorageMock.clear).toHaveBeenCalledTimes(1);
  });

  it("should handle empty localStorage without errors", () => {
    const lsMock = createStorageWithKeys({});
    vi.stubGlobal("localStorage", lsMock);

    expect(() => clearAllUserData()).not.toThrow();
    expect(lsMock.removeItem).not.toHaveBeenCalled();
  });

  it("should log cleared keys via console.debug", () => {
    const lsMock = createStorageWithKeys({
      mamastale_test: "value",
    });
    vi.stubGlobal("localStorage", lsMock);

    clearAllUserData();

    expect(console.debug).toHaveBeenCalledWith(
      "[Auth] Cleared user data:",
      expect.arrayContaining(["mamastale_test"])
    );
  });

  it("should not log when no keys are cleared", () => {
    const lsMock = createStorageWithKeys({
      other: "value",
    });
    vi.stubGlobal("localStorage", lsMock);

    clearAllUserData();

    expect(console.debug).not.toHaveBeenCalled();
  });
});

describe("abortCurrentRequest", () => {
  it("should be a callable function", () => {
    expect(typeof abortCurrentRequest).toBe("function");
  });

  it("should not throw when no request is in flight", () => {
    expect(() => abortCurrentRequest()).not.toThrow();
  });
});
