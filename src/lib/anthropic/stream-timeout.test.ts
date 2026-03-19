import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStreamTimeout, finalMessageWithTimeout } from "./stream-timeout";

describe("createStreamTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onTimeout when initial timeout exceeds", () => {
    const onTimeout = vi.fn();
    const handle = createStreamTimeout(onTimeout, {
      initialMs: 1000,
      checkIntervalMs: 500,
    });

    // Advance past initial timeout
    vi.advanceTimersByTime(1500);
    expect(onTimeout).toHaveBeenCalledWith(expect.stringContaining("initial timeout"));

    handle.cleanup();
  });

  it("should NOT call onTimeout when chunks arrive within initial timeout", () => {
    const onTimeout = vi.fn();
    const handle = createStreamTimeout(onTimeout, {
      initialMs: 1000,
      idleMs: 2000,
      checkIntervalMs: 500,
    });

    // Touch before initial timeout
    vi.advanceTimersByTime(800);
    handle.markFirstChunk();
    handle.touch();

    // Advance past initial timeout but within idle
    vi.advanceTimersByTime(800);
    expect(onTimeout).not.toHaveBeenCalled();

    handle.cleanup();
  });

  it("should call onTimeout when idle timeout exceeds after first chunk", () => {
    const onTimeout = vi.fn();
    const handle = createStreamTimeout(onTimeout, {
      initialMs: 1000,
      idleMs: 2000,
      checkIntervalMs: 500,
    });

    // First chunk arrives
    vi.advanceTimersByTime(500);
    handle.markFirstChunk();
    handle.touch();

    // No more chunks — idle timeout
    vi.advanceTimersByTime(2500);
    expect(onTimeout).toHaveBeenCalledWith(expect.stringContaining("idle timeout"));

    handle.cleanup();
  });

  it("should reset idle timer on touch()", () => {
    const onTimeout = vi.fn();
    const handle = createStreamTimeout(onTimeout, {
      initialMs: 1000,
      idleMs: 2000,
      checkIntervalMs: 500,
    });

    handle.markFirstChunk();
    handle.touch();

    // Keep touching to prevent idle timeout
    vi.advanceTimersByTime(1500);
    handle.touch();
    vi.advanceTimersByTime(1500);
    handle.touch();
    vi.advanceTimersByTime(1500);

    expect(onTimeout).not.toHaveBeenCalled();

    handle.cleanup();
  });

  it("should call onTimeout on absolute timeout regardless of activity", () => {
    const onTimeout = vi.fn();
    const handle = createStreamTimeout(onTimeout, {
      initialMs: 1000,
      idleMs: 2000,
      absoluteMs: 5000,
      checkIntervalMs: 500,
    });

    handle.markFirstChunk();

    // Keep touching but absolute timeout should fire
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(400);
      handle.touch();
    }

    expect(onTimeout).toHaveBeenCalledWith(expect.stringContaining("absolute timeout"));

    handle.cleanup();
  });

  it("should not call onTimeout after cleanup()", () => {
    const onTimeout = vi.fn();
    const handle = createStreamTimeout(onTimeout, {
      initialMs: 1000,
      checkIntervalMs: 500,
    });

    handle.cleanup();

    vi.advanceTimersByTime(5000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});

describe("finalMessageWithTimeout", () => {
  it("should return result when function resolves in time", async () => {
    const result = await finalMessageWithTimeout(
      () => Promise.resolve({ usage: { input_tokens: 100, output_tokens: 200 } }),
      1000
    );
    expect(result).toEqual({ usage: { input_tokens: 100, output_tokens: 200 } });
  });

  it("should return fallback usage on timeout", async () => {
    const result = await finalMessageWithTimeout(
      () => new Promise((resolve) => setTimeout(resolve, 10000)),
      100
    );
    expect(result).toEqual({ usage: { input_tokens: 0, output_tokens: 0 } });
  });

  it("should return fallback usage on rejection", async () => {
    const result = await finalMessageWithTimeout(
      () => Promise.reject(new Error("test")),
      1000
    );
    expect(result).toEqual({ usage: { input_tokens: 0, output_tokens: 0 } });
  });
});
