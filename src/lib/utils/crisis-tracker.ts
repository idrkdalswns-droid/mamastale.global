/**
 * Crisis Event Tracker
 *
 * Records crisis events to Supabase crisis_events + crisis_sessions tables
 * via the record_crisis_event() RPC (Migration 017).
 *
 * Fire-and-forget: never blocks the response.
 *
 * @module crisis-tracker
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface CrisisEventParams {
  sessionId: string;
  userId?: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  cssrsLevel?: number | null;
  keywords?: string[];
  reasoning?: string | null;
}

/**
 * Record a crisis event using the record_crisis_event() RPC.
 * This also activates/escalates the post-crisis session mode.
 * Fire-and-forget — never blocks the response.
 */
export async function recordCrisisEvent(params: CrisisEventParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    const { error } = await supabase.rpc("record_crisis_event", {
      p_session_id: params.sessionId || `anonymous_${Date.now()}`,
      p_user_id: params.userId || null,
      p_severity: params.severity,
      p_cssrs_level: params.cssrsLevel ?? null,
      p_keywords: params.keywords ?? [],
      p_reasoning: params.reasoning ?? null,
    });
    // R6-8: Log RPC failure — crisis events must have audit trail visibility
    if (error) {
      console.error(`[CrisisTracker] FAILED to record ${params.severity} event for session=${params.sessionId}:`, error.code, error.message);
      // P1-6: Slack alert for crisis event recording failure
      const slackUrl = process.env.SLACK_CRISIS_WEBHOOK_URL;
      if (slackUrl) {
        fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 [위기이벤트 기록 실패] severity=${params.severity} session=${params.sessionId.slice(0, 8)}... error=${error.code}`,
          }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    // R6-8: Fire-and-forget but always log failure for observability
    console.error("[CrisisTracker] record_crisis_event threw:", err instanceof Error ? err.message : "Unknown");
    // P1-6: Slack alert for unexpected crisis tracker failure
    const slackUrl = process.env.SLACK_CRISIS_WEBHOOK_URL;
    if (slackUrl) {
      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 [위기이벤트 기록 예외] severity=${params.severity} error=${err instanceof Error ? err.message : "Unknown"}`,
        }),
      }).catch(() => {});
    }
  }
}

/**
 * Check if a session is in post-crisis mode.
 * Returns crisis session state or null if no active crisis.
 */
export async function getPostCrisisState(sessionId: string): Promise<{
  crisisMode: boolean;
  turnsRemaining: number;
  highestSeverity: string;
  crisisCount: number;
} | null> {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return null;

    const { data } = await supabase
      .from("crisis_sessions")
      .select("crisis_mode, post_crisis_turns_remaining, highest_severity, crisis_count")
      .eq("session_id", sessionId)
      .eq("crisis_mode", true)
      .single();

    if (!data) return null;

    return {
      crisisMode: data.crisis_mode,
      turnsRemaining: data.post_crisis_turns_remaining,
      highestSeverity: data.highest_severity,
      crisisCount: data.crisis_count,
    };
  } catch {
    return null;
  }
}

/**
 * Decrement post-crisis turn counter.
 * When turns reach 0, crisis mode is automatically deactivated.
 * Fire-and-forget.
 */
export async function decrementPostCrisisTurn(sessionId: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    await supabase.rpc("decrement_post_crisis_turn", {
      p_session_id: sessionId,
    });
  } catch {
    // Fire-and-forget
  }
}
