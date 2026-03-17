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
