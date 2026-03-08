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
