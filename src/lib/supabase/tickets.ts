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

  // Fallback: non-atomic read-then-update (race condition possible)
  // Run supabase/migrations/006_ticket_increment.sql to enable atomic mode
  const { data: profile } = await supabase
    .from("profiles")
    .select("free_stories_remaining")
    .eq("id", userId)
    .single();

  const currentTickets = profile?.free_stories_remaining ?? 0;
  const newTotal = currentTickets + count;

  await supabase
    .from("profiles")
    .update({
      free_stories_remaining: newTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return newTotal;
}
