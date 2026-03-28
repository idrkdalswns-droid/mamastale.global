/**
 * Supabase-backed Rate Limiter with in-memory fallback
 *
 * Primary: Persistent rate limiting via Supabase RPC (survives deploys)
 * Fallback: In-memory map if Supabase is unavailable
 *
 * @module rate-limiter
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── In-memory fallback (same pattern as original checkRateLimit) ───
const rateLimitFallbackMap = new Map<string, { count: number; resetAt: number }>();
let lastFallbackCleanup = 0;
const CLEANUP_INTERVAL_MS = 30_000;

function checkRateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  if (now - lastFallbackCleanup > CLEANUP_INTERVAL_MS) {
    lastFallbackCleanup = now;
    for (const [k, v] of rateLimitFallbackMap) {
      if (now > v.resetAt) rateLimitFallbackMap.delete(k);
    }
  }
  // LAUNCH-FIX: Selective eviction instead of map.clear() to prevent rate limit reset attack
  // An attacker could fill the map with dummy IPs to clear all legitimate rate limits
  if (rateLimitFallbackMap.size > 1000) {
    // Remove oldest 50% of entries by checking reset time
    const entries = Array.from(rateLimitFallbackMap.entries());
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
    const removeCount = Math.floor(entries.length / 2);
    for (let i = 0; i < removeCount; i++) {
      rateLimitFallbackMap.delete(entries[i][0]);
    }
  }

  const entry = rateLimitFallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitFallbackMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Persistent rate limiting with Supabase primary, in-memory fallback.
 *
 * @param key - Rate limit key (e.g. "chat:auth:user-uuid")
 * @param limit - Max requests per window
 * @param windowSeconds - Window duration in seconds (default: 60)
 * @returns true if within limit, false if rate-limited
 */
export async function checkRateLimitPersistent(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) {
      // Supabase not configured → use in-memory fallback
      return checkRateLimitInMemory(key, limit, windowSeconds * 1000);
    }

    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.warn("[RateLimit] Supabase RPC failed, falling back to in-memory:", error.message);
      return checkRateLimitInMemory(key, limit, windowSeconds * 1000);
    }

    return data === true;
  } catch {
    // Any unexpected error → fall back to in-memory
    return checkRateLimitInMemory(key, limit, windowSeconds * 1000);
  }
}

// Periodically cleanup expired Supabase rate limits (10% probability)
export async function maybeCleanupRateLimits(): Promise<void> {
  if (Math.random() > 0.1) return;
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;
    try { await supabase.rpc("cleanup_expired_rate_limits"); } catch { /* ignore */ }
  } catch { /* ignore */ }
}

// ─── In-memory rate limiter factory (namespace-isolated) ───

interface InMemoryLimiter {
  /** @returns true if within limit, false if rate-limited */
  check(key: string, limit: number, windowMs: number): boolean;
  /** Remove a key from the map (e.g. rollback on failure) */
  reset(key: string): void;
}

/**
 * Create a namespace-isolated in-memory rate limiter.
 * Each instance has its own Map, so eviction in one namespace
 * never affects another.
 *
 * Use for non-LLM API routes where per-isolate rate limiting is acceptable.
 * For LLM routes (chat, stream), use checkRateLimitPersistent instead.
 *
 * @param _namespace - Identifier for logging/debugging (not used in key)
 * @param opts.maxEntries - Max map size before selective eviction (default: 300)
 */
export function createInMemoryLimiter(
  _namespace: string,
  opts?: { maxEntries?: number }
): InMemoryLimiter {
  const map = new Map<string, { count: number; resetAt: number }>();
  const maxEntries = opts?.maxEntries ?? 300;
  let lastCleanup = 0;

  return {
    check(key: string, limit: number, windowMs: number): boolean {
      const now = Date.now();
      // Periodic cleanup of expired entries
      if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
        lastCleanup = now;
        for (const [k, v] of map) {
          if (now > v.resetAt) map.delete(k);
        }
      }
      // Selective eviction when map is full
      if (map.size > maxEntries) {
        const entries = Array.from(map.entries());
        entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
        const removeCount = Math.floor(entries.length / 2);
        for (let i = 0; i < removeCount; i++) {
          map.delete(entries[i][0]);
        }
      }

      const entry = map.get(key);
      if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count++;
      return true;
    },
    reset(key: string): void {
      map.delete(key);
    },
  };
}

/** Rate limit key prefix constants — prevents typos, enables build-time verification */
export const RATE_KEYS = {
  PDF: "pdf",
  LIKE_GUEST_BURST: "like:guest:burst",
  LIKE_GUEST_DAILY: "like:guest:daily",
  LIKE_DEDUP: "like:dedup",
  LIKE_AUTH: "like:auth",
  LIKE_CHECK: "like:check",
  COMMENT_GET: "comment:get",
  COMMENT_POST: "comment:post",
  COMMENT_REPORT: "comment:report",
  ACCOUNT_DELETE: "account:delete",
  ACCOUNT_EXPORT: "account:export",
  ADMIN: "admin:obs",
  ERROR_REPORT: "error:report",
  FEEDBACK: "feedback",
  INTEREST: "interest",
  // Bug Bounty: 추가 누락분
  STORY_SAVE: "story:save",
  STORY_LIST: "story:list",
  REVIEW_POST: "review:post",
  REVIEW_GET: "review:get",
  TICKET_CHECK: "ticket:check",
  TICKET_USE: "ticket:use",
  REFERRAL: "referral",
  PAYMENT_CONFIRM: "payment:confirm",
  PRESENCE: "presence",
  COMMUNITY_DETAIL: "community:detail",
  COMMUNITY_VIEW_DEDUP: "community:view-dedup",
  PUSH_SEND: "push:send",
  TEACHER_PDF: "teacher:pdf",
  TEACHER_WORKSHEET: "teacher:worksheet",
  STORY_DELETE: "story:delete",
  TEACHER_GENERATE_STORY: "teacher:generate:story",
  // 딸깍 동화 (TQ)
  TQ_START: "tq:start",
  TQ_NEXT_PHASE: "tq:next-phase",
  TQ_SUBMIT: "tq:submit",
  TQ_GENERATE: "tq:generate",
  TQ_EVENT: "tq:event",
  TQ_SESSIONS: "tq:sessions",
  TQ_DETAIL: "tq:detail",
} as const;
