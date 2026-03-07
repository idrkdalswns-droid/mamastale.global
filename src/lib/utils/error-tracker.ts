/**
 * Lightweight Error Tracking for Edge Runtime
 *
 * Cloudflare Pages Edge Runtime 환경에서 Sentry 대신 사용하는 경량 에러 트래커.
 * 에러를 Supabase event_logs에 기록하고, 클라이언트 에러도 캡처합니다.
 *
 * 특징:
 * - Edge Runtime 호환 (Node.js API 미사용)
 * - fire-and-forget (응답 차단 없음)
 * - 클라이언트/서버 양쪽 에러 캡처
 * - 중복 에러 디바운싱 (같은 에러 1분 내 1회만)
 *
 * @module error-tracker
 */

import { logEvent } from "./llm-logger";

// ─── Deduplication ───
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000; // 1 minute

function getErrorFingerprint(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  return `${context || "unknown"}:${msg.slice(0, 100)}`;
}

function isDuplicate(fingerprint: string): boolean {
  const now = Date.now();
  const lastSeen = recentErrors.get(fingerprint);
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
    return true;
  }
  recentErrors.set(fingerprint, now);
  // Cleanup old entries
  if (recentErrors.size > 100) {
    for (const [key, time] of recentErrors) {
      if (now - time > DEDUP_WINDOW_MS) recentErrors.delete(key);
    }
  }
  return false;
}

/**
 * Track a server-side error. Fire-and-forget.
 */
export function trackServerError(
  error: unknown,
  context: {
    endpoint?: string;
    userId?: string | null;
    phase?: number;
    extra?: Record<string, unknown>;
  } = {}
): void {
  const fingerprint = getErrorFingerprint(error, context.endpoint);
  if (isDuplicate(fingerprint)) return;

  const errorInfo = error instanceof Error
    ? {
        name: error.name,
        message: error.message.slice(0, 500),
        stack: error.stack?.slice(0, 1000),
      }
    : { name: "Unknown", message: String(error).slice(0, 500) };

  logEvent({
    eventType: "error",
    endpoint: context.endpoint,
    userId: context.userId,
    metadata: {
      ...errorInfo,
      phase: context.phase,
      ...context.extra,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});

  // Console output for Cloudflare Pages logs
  console.error(`[ErrorTracker] ${context.endpoint || "unknown"}: ${errorInfo.name} - ${errorInfo.message}`);
}

/**
 * Track an API response error (4xx/5xx). Fire-and-forget.
 */
export function trackApiError(
  statusCode: number,
  message: string,
  context: {
    endpoint?: string;
    method?: string;
    userId?: string | null;
  } = {}
): void {
  // Only track 5xx errors (server errors) — 4xx are expected
  if (statusCode < 500) return;

  const fingerprint = getErrorFingerprint(message, context.endpoint);
  if (isDuplicate(fingerprint)) return;

  logEvent({
    eventType: "api_error",
    endpoint: context.endpoint,
    method: context.method,
    statusCode,
    userId: context.userId,
    metadata: {
      message: message.slice(0, 500),
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});
}

/**
 * Client-side error reporter endpoint handler.
 * Call this from a `/api/errors/report` endpoint.
 */
export function parseClientErrorReport(body: unknown): {
  valid: boolean;
  data?: {
    message: string;
    source: string;
    stack?: string;
    url?: string;
    userAgent?: string;
  };
} {
  if (!body || typeof body !== "object") return { valid: false };

  const b = body as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message.slice(0, 500) : "";
  const source = typeof b.source === "string" ? b.source.slice(0, 100) : "unknown";

  if (!message) return { valid: false };

  return {
    valid: true,
    data: {
      message,
      source,
      stack: typeof b.stack === "string" ? b.stack.slice(0, 1000) : undefined,
      url: typeof b.url === "string" ? b.url.slice(0, 500) : undefined,
      userAgent: typeof b.userAgent === "string" ? b.userAgent.slice(0, 200) : undefined,
    },
  };
}
