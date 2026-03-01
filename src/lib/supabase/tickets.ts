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

  // IN-1: Fallback uses read-then-update which has race condition.
  // Log a warning so operators know to deploy the RPC function.
  console.warn("[Tickets] increment_tickets RPC unavailable — using non-atomic fallback. Deploy 006_ticket_increment.sql to fix.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("free_stories_remaining")
    .eq("id", userId)
    .single();

  const currentTickets = profile?.free_stories_remaining ?? 0;
  const newTotal = Math.max(0, currentTickets + count); // IN-1: Prevent negative tickets

  await supabase
    .from("profiles")
    .update({
      free_stories_remaining: newTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return newTotal;
}
