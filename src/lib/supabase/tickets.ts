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
    if (!error && typeof data === "number") {
      // Set has_purchased flag (idempotent, fire-and-forget)
      supabase.from("profiles").update({ has_purchased: true }).eq("id", userId).then(() => {}).catch((e: unknown) => {
        console.error("[Tickets] has_purchased update failed:", e instanceof Error ? e.message : String(e));
      });
      return data;
    }
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
    // BE-08 FIX: Upper bound (999) prevents runaway accumulation from repeated webhook retries
    const MAX_TICKETS = 999;
    const newTotal = Math.min(MAX_TICKETS, Math.max(0, currentTickets + count));

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
      // Set has_purchased flag (idempotent, fire-and-forget)
      supabase.from("profiles").update({ has_purchased: true }).eq("id", userId).then(() => {}).catch((e: unknown) => {
        console.error("[Tickets] has_purchased update failed (CAS path):", e instanceof Error ? e.message : String(e));
      });
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

/**
 * Atomic worksheet ticket increment.
 * Uses `refund_worksheet_ticket` RPC (030_worksheet_system.sql) for atomic add.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function incrementWorksheetTickets(
  supabase: any,
  userId: string,
  count: number
): Promise<number> {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error(`Invalid worksheet ticket count: ${count}`);
  }

  // Use refund_worksheet_ticket RPC (adds tickets atomically)
  const { error: rpcErr } = await supabase.rpc("refund_worksheet_ticket", {
    p_user_id: userId,
    p_count: count,
  });

  if (rpcErr) {
    throw new Error(`RPC refund_worksheet_ticket failed: ${rpcErr.code} ${rpcErr.message}`);
  }

  // Read new balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("worksheet_tickets_remaining")
    .eq("id", userId)
    .single();

  return profile?.worksheet_tickets_remaining ?? 0;
}
