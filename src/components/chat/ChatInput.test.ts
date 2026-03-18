import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * PRE-2: ChatInput debounce logic tests
 *
 * ChatInput is a React component that can't be rendered in node environment.
 * Instead, we test the core debounce logic pattern that Fix 1 will introduce:
 *   - lastSendRef timestamp + 800ms debounce window
 *   - sendingRef mutex released on isLoading change
 *
 * These tests validate the ALGORITHM, not the React rendering.
 */

// ─── Extract the debounce logic as a pure function for testing ───
// This mirrors what ChatInput.handleSend will do after Fix 1

interface SendState {
  input: string;
  isLoading: boolean;
  disabled: boolean;
  sendingRef: boolean;
  lastSendTime: number;
}

const DEBOUNCE_MS = 800;

/**
 * Pure function version of ChatInput.handleSend logic (post-Fix 1).
 * Returns { shouldSend, newState } instead of mutating refs.
 */
function shouldSend(state: SendState, now: number): { allowed: boolean; newLastSendTime: number; newSendingRef: boolean } {
  if (!state.input.trim() || state.isLoading || state.disabled || state.sendingRef) {
    return { allowed: false, newLastSendTime: state.lastSendTime, newSendingRef: state.sendingRef };
  }
  // Fix 1: timestamp-based debounce
  if (now - state.lastSendTime < DEBOUNCE_MS) {
    return { allowed: false, newLastSendTime: state.lastSendTime, newSendingRef: state.sendingRef };
  }
  return { allowed: true, newLastSendTime: now, newSendingRef: true };
}

// ────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────

describe("ChatInput — debounce logic (Fix 1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow first send with valid input", () => {
    const state: SendState = {
      input: "안녕하세요",
      isLoading: false,
      disabled: false,
      sendingRef: false,
      lastSendTime: 0,
    };

    const result = shouldSend(state, Date.now());
    expect(result.allowed).toBe(true);
    expect(result.newSendingRef).toBe(true);
  });

  it("should block rapid sends within 800ms window", () => {
    const now = Date.now();
    const state: SendState = {
      input: "메시지",
      isLoading: false,
      disabled: false,
      sendingRef: false,
      lastSendTime: 0,
    };

    // First send — allowed
    const first = shouldSend(state, now);
    expect(first.allowed).toBe(true);

    // Second send 100ms later — blocked by debounce
    const state2: SendState = {
      ...state,
      sendingRef: false, // assume lock released by isLoading change
      lastSendTime: first.newLastSendTime,
    };
    const second = shouldSend(state2, now + 100);
    expect(second.allowed).toBe(false);

    // Third send 500ms after first — still blocked
    const third = shouldSend(state2, now + 500);
    expect(third.allowed).toBe(false);

    // Fourth send 801ms after first — allowed
    const fourth = shouldSend(state2, now + 801);
    expect(fourth.allowed).toBe(true);
  });

  it("should block when sendingRef mutex is true", () => {
    const state: SendState = {
      input: "메시지",
      isLoading: false,
      disabled: false,
      sendingRef: true, // mutex locked
      lastSendTime: 0,
    };

    const result = shouldSend(state, Date.now());
    expect(result.allowed).toBe(false);
  });

  it("should block when isLoading is true", () => {
    const state: SendState = {
      input: "메시지",
      isLoading: true,
      disabled: false,
      sendingRef: false,
      lastSendTime: 0,
    };

    const result = shouldSend(state, Date.now());
    expect(result.allowed).toBe(false);
  });

  it("should block empty input", () => {
    const state: SendState = {
      input: "   ",
      isLoading: false,
      disabled: false,
      sendingRef: false,
      lastSendTime: 0,
    };

    const result = shouldSend(state, Date.now());
    expect(result.allowed).toBe(false);
  });

  it("should allow re-send after 800ms even with rapid initial attempts", () => {
    const baseTime = 1000000;
    const state: SendState = {
      input: "메시지",
      isLoading: false,
      disabled: false,
      sendingRef: false,
      lastSendTime: 0,
    };

    // First send
    const r1 = shouldSend(state, baseTime);
    expect(r1.allowed).toBe(true);

    // Simulate: lock released, try rapid sends
    const afterFirst: SendState = { ...state, lastSendTime: r1.newLastSendTime };

    // 200ms, 400ms, 600ms — all blocked
    expect(shouldSend(afterFirst, baseTime + 200).allowed).toBe(false);
    expect(shouldSend(afterFirst, baseTime + 400).allowed).toBe(false);
    expect(shouldSend(afterFirst, baseTime + 600).allowed).toBe(false);

    // 800ms — allowed
    const r2 = shouldSend(afterFirst, baseTime + 800);
    expect(r2.allowed).toBe(true);

    // Rapid again after second send — blocked
    const afterSecond: SendState = { ...state, lastSendTime: r2.newLastSendTime };
    expect(shouldSend(afterSecond, baseTime + 900).allowed).toBe(false);
    expect(shouldSend(afterSecond, baseTime + 1600).allowed).toBe(true);
  });
});
