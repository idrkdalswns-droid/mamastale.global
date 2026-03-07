/**
 * Semantic Response Cache (GPTCache-inspired)
 *
 * Caches Phase 1 empathy responses to reduce API costs.
 * Uses SHA-256 hash of normalized user message as cache key.
 * Web Crypto API for Edge Runtime compatibility.
 *
 * Rules:
 * - ONLY Phase 1 responses are cached
 * - Crisis-intercepted responses are NEVER cached
 * - 24-hour TTL
 *
 * @module response-cache
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * SHA-256 hash using Web Crypto API (Edge Runtime compatible)
 */
async function hashMessage(message: string): Promise<string> {
  const normalized = message.toLowerCase().trim().replace(/\s+/g, " ");
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Check cache for a Phase 1 response.
 * Returns cached response or null if not found/expired.
 */
export async function getCachedResponse(
  userMessage: string,
  phase: number
): Promise<{ content: string; phase: number } | null> {
  // Only cache Phase 1
  if (phase !== 1) return null;

  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return null;

    const hash = await hashMessage(userMessage);

    const { data, error } = await supabase
      .from("response_cache")
      .select("response_content, response_phase, hit_count")
      .eq("message_hash", hash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Increment hit count (fire-and-forget)
    try {
      await supabase
        .from("response_cache")
        .update({ hit_count: (data.hit_count || 1) + 1 })
        .eq("message_hash", hash);
    } catch { /* ignore */ }

    return {
      content: data.response_content,
      phase: data.response_phase ?? 1,
    };
  } catch {
    return null;
  }
}

/**
 * Store a Phase 1 response in the cache.
 * Fire-and-forget — never blocks the response.
 */
export async function setCachedResponse(
  userMessage: string,
  phase: number,
  content: string,
  responsePhase: number
): Promise<void> {
  // Only cache Phase 1
  if (phase !== 1) return;

  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    const hash = await hashMessage(userMessage);

    await supabase.from("response_cache").upsert(
      {
        message_hash: hash,
        phase: 1,
        response_content: content,
        response_phase: responsePhase,
        hit_count: 1,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "message_hash" }
    );
  } catch {
    // Fire-and-forget
  }
}

/**
 * Periodically cleanup expired cache entries (10% probability)
 */
export async function maybeCleanupCache(): Promise<void> {
  if (Math.random() > 0.1) return;
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;
    try { await supabase.rpc("cleanup_expired_cache"); } catch { /* ignore */ }
  } catch { /* ignore */ }
}
