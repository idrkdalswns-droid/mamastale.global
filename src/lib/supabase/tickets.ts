/**
 * Atomic ticket increment utility.
 * Uses `increment_tickets` RPC if available (run 006_ticket_increment.sql),
 * falls back to non-atomic read-then-update.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function incrementTickets(
  supabase: any,
  userId: string,
  count: number
): Promise<number> {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error(`Invalid ticket count: ${count}`);
  }

  // Try atomic RPC first
  try {
    const { data, error } = await supabase.rpc("increment_tickets", {
      p_user_id: userId,
      p_count: count,
    });
    if (!error && typeof data === "number") return data;
    // V5-FIX #2: Differentiate RPC errors — only fall back to CAS for "function not found"
    if (error && error.code !== "PGRST116") {
      throw new Error(`RPC increment_tickets failed: ${error.code} ${error.message}`);
    }
  } catch (rpcErr) {
    // PGRST116 = function not found → expected, fall through to CAS
    // Other errors (timeout, auth, connection) → re-throw
    if (rpcErr instanceof Error && !rpcErr.message.includes("PGRST116")) {
      throw rpcErr;
    }
  }

  // IN-1: Fallback uses read-then-update.
  // CTO-FIX: Added CAS guard (.eq on current value) to prevent TOCTOU race condition.
  console.warn("[Tickets] increment_tickets RPC unavailable — using CAS fallback. Deploy 006_ticket_increment.sql for best performance.");

  // V5-FIX #1: 3→5 retries + jitter backoff for better concurrency handling
  const MAX_CAS_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("free_stories_remaining")
      .eq("id", userId)
      .single();

    const currentTickets = profile?.free_stories_remaining ?? 0;
    const newTotal = Math.max(0, currentTickets + count); // Prevent negative tickets

    // CAS guard: only update if value hasn't changed since read
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({
        free_stories_remaining: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("free_stories_remaining", currentTickets)
      .select("free_stories_remaining")
      .single();

    if (!updateErr && updated) {
      return updated.free_stories_remaining;
    }

    // CAS miss — another concurrent write changed the value; retry with backoff
    if (attempt < MAX_CAS_RETRIES - 1) {
      console.warn(`[Tickets] CAS miss for user=${userId.slice(0, 8)}…, retry ${attempt + 1}/${MAX_CAS_RETRIES}`);
      // V5-FIX #1: Exponential backoff with random jitter to reduce collision probability
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1) + Math.random() * 50));
    }
  }

  // All retries failed — throw error instead of silently returning stale count
  throw new Error(`CAS ticket increment failed after ${MAX_CAS_RETRIES} retries for user ${userId}`);
}
