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
  } catch {
    // RPC not available — fall through to non-atomic
  }

  // IN-1: Fallback uses read-then-update.
  // CTO-FIX: Added CAS guard (.eq on current value) to prevent TOCTOU race condition.
  console.warn("[Tickets] increment_tickets RPC unavailable — using CAS fallback. Deploy 006_ticket_increment.sql for best performance.");

  const MAX_CAS_RETRIES = 3;
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

    // CAS miss — another concurrent write changed the value; retry
    if (attempt < MAX_CAS_RETRIES - 1) {
      console.warn(`[Tickets] CAS miss for user=${userId.slice(0, 8)}…, retry ${attempt + 1}/${MAX_CAS_RETRIES}`);
    }
  }

  // All retries failed — throw error instead of silently returning stale count
  throw new Error(`CAS ticket increment failed after ${MAX_CAS_RETRIES} retries for user ${userId}`);
}
