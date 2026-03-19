/**
 * Shared streaming timeout utility for Anthropic SSE endpoints.
 * Used by: /api/chat/stream, /api/teacher/stream
 *
 * Implements 3-tier timeout:
 * 1. Initial timeout: max wait for first chunk (default 30s)
 * 2. Idle timeout: max wait between chunks (default 90s)
 * 3. Absolute timeout: max total stream duration (default 300s / 5min)
 */

export interface StreamTimeoutConfig {
  /** Max wait for first chunk in ms (default: 30_000) */
  initialMs?: number;
  /** Max idle time between chunks in ms (default: 90_000) */
  idleMs?: number;
  /** Absolute max stream duration in ms (default: 300_000) */
  absoluteMs?: number;
  /** Check interval in ms (default: 5_000) */
  checkIntervalMs?: number;
}

export interface StreamTimeoutHandle {
  /** Call when a chunk is received to reset idle timer */
  touch(): void;
  /** Call when the first chunk is received */
  markFirstChunk(): void;
  /** Call in finally block to clean up interval */
  cleanup(): void;
}

export function createStreamTimeout(
  onTimeout: (reason: string) => void,
  config: StreamTimeoutConfig = {}
): StreamTimeoutHandle {
  const {
    initialMs = 30_000,
    idleMs = 90_000,
    absoluteMs = 300_000,
    checkIntervalMs = 5_000,
  } = config;

  const startTime = Date.now();
  let lastChunkTime = Date.now();
  let firstChunkReceived = false;

  const interval = setInterval(() => {
    const now = Date.now();
    const idleLimit = firstChunkReceived ? idleMs : initialMs;

    if (now - lastChunkTime > idleLimit) {
      const reason = firstChunkReceived ? "idle" : "initial";
      onTimeout(`${reason} timeout (${idleLimit / 1000}s no data)`);
      clearInterval(interval);
    } else if (now - startTime > absoluteMs) {
      onTimeout(`absolute timeout (${absoluteMs / 1000}s total)`);
      clearInterval(interval);
    }
  }, checkIntervalMs);

  return {
    touch() {
      lastChunkTime = Date.now();
    },
    markFirstChunk() {
      firstChunkReceived = true;
      lastChunkTime = Date.now();
    },
    cleanup() {
      clearInterval(interval);
    },
  };
}

/**
 * Wrap stream.finalMessage() with a timeout to prevent hang.
 * Returns minimal usage data on timeout.
 */
export async function finalMessageWithTimeout<T>(
  finalMessageFn: () => Promise<T>,
  timeoutMs = 5_000
): Promise<T | { usage: { input_tokens: number; output_tokens: number } }> {
  try {
    return await Promise.race([
      finalMessageFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("finalMessage timeout")), timeoutMs)
      ),
    ]);
  } catch {
    return { usage: { input_tokens: 0, output_tokens: 0 } };
  }
}
