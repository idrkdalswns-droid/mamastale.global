import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { checkPremiumStatus } from "@/lib/anthropic/chat-shared";
import { t } from "@/lib/i18n";

export const runtime = "edge";

/**
 * POST /api/tickets/use
 *
 * Deducts 1 ticket at chat start. Called when user confirms
 * "티켓 한 장을 사용하시겠습니까?" before beginning a new story.
 *
 * Uses atomic conditional update (gte check) to prevent race conditions.
 * Returns updated remaining count + premium status.
 */
export async function POST(request: NextRequest) {
  // P0-5: Persistent rate limit (survives Edge multi-instance)
  const ip = getClientIP(request);
  const allowed = await checkRateLimitPersistent(`ticket_use:${ip}`, 5, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: t("Errors.rateLimit.tooManyRequests") },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Tickets/Use");
  if (!user) {
    // CRITICAL: Apply cookies even on auth failure — Supabase may have started
    // a session refresh during getUser(), and dropping those cookies breaks
    // the client's session permanently.
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
    );
  }

  try {
    // ROOT-CAUSE FIX: Query ONLY free_stories_remaining first.
    // The previous code selected "free_stories_remaining, metadata" in a single query.
    // If the "metadata" column doesn't exist in profiles, PostgREST returns a column-not-found
    // error (code !== PGRST116), which triggered the t("Errors.ticket.profileReadFailed") error.
    const { data: profile, error: readError } = await sb.client
      .from("profiles")
      .select("free_stories_remaining")
      .eq("id", user.id)
      .single();

    if (readError && readError.code !== "PGRST116") {
      // Real DB error (not "no rows found")
      console.error("[Tickets/Use] Profile read error:", readError.code, readError.message);
      return sb.applyCookies(NextResponse.json(
        { error: t("Errors.ticket.profileReadFailed") },
        { status: 500 }
      ));
    }

    // Helper: Try to read metadata column separately (graceful fallback)
    // If column doesn't exist, returns empty object instead of crashing
    const readMetadata = async (userId: string): Promise<Record<string, unknown>> => {
      try {
        const { data: metaRow, error: metaErr } = await sb.client
          .from("profiles")
          .select("metadata")
          .eq("id", userId)
          .single();
        if (metaErr || !metaRow) return {};
        return (metaRow.metadata as Record<string, unknown>) || {};
      } catch {
        return {};
      }
    };

    // New user — no profile row yet → create with 0 free tickets
    // (first story is free without ticket — freemium model v2)
    if (!profile) {
      // LAUNCH-FIX: Use ignoreDuplicates to prevent overwriting existing profile
      const { error: insertErr } = await sb.client
        .from("profiles")
        .upsert({
          id: user.id,
          free_stories_remaining: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });

      if (insertErr) {
        console.error("[Tickets/Use] Profile create error:", insertErr.code);
        return sb.applyCookies(NextResponse.json(
          { error: t("Errors.ticket.profileCreateFailed") },
          { status: 500 }
        ));
      }

      // Re-read actual profile (another concurrent request may have created it first)
      const { data: actualProfile } = await sb.client
        .from("profiles")
        .select("free_stories_remaining")
        .eq("id", user.id)
        .single();

      const actualRemaining = actualProfile?.free_stories_remaining ?? 0;
      if (actualRemaining <= 0) {
        return sb.applyCookies(NextResponse.json(
          { error: "no_tickets", message: t("Errors.ticket.insufficient") },
          { status: 403 }
        ));
      }

      // H19-FIX: Use atomic RPC (same as existing user path) instead of CAS
      let newUserRemaining: number;
      try {
        const { data, error: rpcErr } = await sb.client.rpc("decrement_ticket", {
          p_user_id: user.id,
        });
        if (rpcErr) {
          if (rpcErr.message?.includes("insufficient_tickets")) {
            return sb.applyCookies(NextResponse.json(
              { error: "no_tickets", message: t("Errors.ticket.insufficient") },
              { status: 403 }
            ));
          }
          if (rpcErr.code === "PGRST116") {
            // RPC not found — fall back to CAS for backward compatibility
            console.warn("[Tickets/Use] decrement_ticket RPC not found (new user path)");
            const { data: casResult, error: deductError } = await sb.client
              .from("profiles")
              .update({
                free_stories_remaining: actualRemaining - 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id)
              .eq("free_stories_remaining", actualRemaining)
              .select("free_stories_remaining")
              .single();
            if (deductError || !casResult) {
              return sb.applyCookies(NextResponse.json(
                { error: "concurrent_conflict", message: t("Errors.ticket.concurrentConflict") },
                { status: 409 }
              ));
            }
            newUserRemaining = casResult.free_stories_remaining;
          } else {
            throw rpcErr;
          }
        } else {
          newUserRemaining = data as number;
        }
      } catch (rpcCatchErr) {
        const errMsg = rpcCatchErr instanceof Error ? rpcCatchErr.message : String(rpcCatchErr);
        if (errMsg.includes("insufficient_tickets")) {
          return sb.applyCookies(NextResponse.json(
            { error: "no_tickets", message: t("Errors.ticket.insufficient") },
            { status: 403 }
          ));
        }
        throw rpcCatchErr;
      }

      // B3 Fix: Use subscriptions table (refund-aware)
      const isPremium = await checkPremiumStatus(sb.client, user.id);

      return sb.applyCookies(NextResponse.json({
        success: true,
        remaining: newUserRemaining,
        isPremium,
      }));
    }

    const remaining = profile.free_stories_remaining ?? 0;
    if (remaining <= 0) {
      return sb.applyCookies(NextResponse.json(
        { error: "no_tickets", message: t("Errors.ticket.insufficient") },
        { status: 403 }
      ));
    }

    // Bug Bounty 3-1 FIX: Use atomic RPC with FOR UPDATE row lock instead of CAS.
    // CAS had a race window: two concurrent reads could get the same value and both succeed.
    // decrement_ticket RPC (033_atomic_ticket_decrement.sql) locks the row during read+update.
    let newRemaining: number;
    try {
      const { data, error: rpcErr } = await sb.client.rpc("decrement_ticket", {
        p_user_id: user.id,
      });
      if (rpcErr) {
        // Check for specific error types from the RPC
        if (rpcErr.message?.includes("insufficient_tickets")) {
          return sb.applyCookies(NextResponse.json(
            { error: "no_tickets", message: t("Errors.ticket.insufficient") },
            { status: 403 }
          ));
        }
        if (rpcErr.code === "PGRST116") {
          // RPC not found — fall back to old CAS logic for backward compatibility
          console.warn("[Tickets/Use] decrement_ticket RPC not found — deploy 033_atomic_ticket_decrement.sql");
          const { data: casResult, error: deductError } = await sb.client
            .from("profiles")
            .update({
              free_stories_remaining: remaining - 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)
            .eq("free_stories_remaining", remaining)
            .select("free_stories_remaining")
            .single();
          if (deductError || !casResult) {
            return sb.applyCookies(NextResponse.json(
              { error: "concurrent_conflict", message: t("Errors.ticket.concurrentConflict") },
              { status: 409 }
            ));
          }
          newRemaining = casResult.free_stories_remaining;
        } else {
          throw rpcErr;
        }
      } else {
        newRemaining = data as number;
      }
    } catch (rpcCatchErr) {
      const errMsg = rpcCatchErr instanceof Error ? rpcCatchErr.message : String(rpcCatchErr);
      if (errMsg.includes("insufficient_tickets")) {
        return sb.applyCookies(NextResponse.json(
          { error: "no_tickets", message: t("Errors.ticket.insufficient") },
          { status: 403 }
        ));
      }
      throw rpcCatchErr;
    }

    const updated = { free_stories_remaining: newRemaining };

    // B3 Fix: Use subscriptions table (refund-aware)
    const isPremium = await checkPremiumStatus(sb.client, user.id);

    // Bug Bounty 3-2 FIX: Record ticket usage timestamp for /api/stories POST verification
    // Bug Bounty v1.42 Fix 1-1: Use JSONB partial update RPC to prevent metadata overwrite.
    // Previously used spread ({ ...metadata, last_ticket_used_at: ... }) which could overwrite
    // concurrent changes (e.g. processed_orders from payment webhook) → data loss.
    // H24-FIX: Metadata update with 1 retry + structured warning
    // v1.60.2 FIX: Add spread fallback after RPC failure + return timestamp for client-side backup
    const ticketTimestamp = new Date().toISOString();
    let metadataUpdated = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error: rpcErr } = await sb.client.rpc("update_profile_metadata_field", {
          p_user_id: user.id,
          p_key: "last_ticket_used_at",
          p_value: JSON.stringify(ticketTimestamp),
        });
        if (rpcErr && rpcErr.code === "PGRST116") {
          // RPC not found — fallback to spread (backward compat)
          console.warn("[Tickets/Use] update_profile_metadata_field RPC not found — using spread fallback");
          const fallbackMeta = await readMetadata(user.id);
          await sb.client
            .from("profiles")
            .update({ metadata: { ...fallbackMeta, last_ticket_used_at: ticketTimestamp } })
            .eq("id", user.id);
          metadataUpdated = true;
          break; // Fallback succeeded
        } else if (rpcErr) {
          if (attempt === 0) {
            console.warn(`[Tickets/Use] Metadata update attempt 1 failed: ${rpcErr.code}, retrying...`);
            continue; // Retry once
          }
          console.error(`[Tickets/Use] Metadata update failed after retry: code=${rpcErr.code} hint=${rpcErr.hint || "none"}`);
        } else {
          metadataUpdated = true;
        }
        break; // Success or final failure
      } catch (err) {
        if (attempt === 0) continue; // Retry once
        console.error("[Tickets/Use] Failed to record last_ticket_used_at after retry:", err instanceof Error ? err.message : String(err));
      }
    }

    // v1.60.2: If RPC failed, try spread fallback as last resort
    if (!metadataUpdated) {
      try {
        console.warn("[Tickets/Use] RPC failed — attempting spread fallback as last resort");
        const fallbackMeta = await readMetadata(user.id);
        await sb.client
          .from("profiles")
          .update({ metadata: { ...fallbackMeta, last_ticket_used_at: ticketTimestamp } })
          .eq("id", user.id);
        metadataUpdated = true;
        console.info("[Tickets/Use] Spread fallback succeeded");
      } catch (spreadErr) {
        console.error("[Tickets/Use] Spread fallback also failed:", spreadErr instanceof Error ? spreadErr.message : String(spreadErr));
      }
    }

    // v1.60.2: Return ticketTimestamp so client can use as fallback for /api/stories
    return sb.applyCookies(NextResponse.json({
      success: true,
      remaining: updated.free_stories_remaining,
      isPremium,
      ticketTimestamp,
      metadataUpdated,
    }));
  } catch (error) {
    // R4-FIX: Log error.name instead of error.message to avoid PII leakage
    console.error("[Tickets/Use] Error:", error instanceof Error ? error.name : "Unknown");
    return sb.applyCookies(NextResponse.json(
      { error: t("Errors.ticket.usageError") },
      { status: 500 }
    ));
  }
}
