/**
 * LLM Call Observability Logger (Langfuse-inspired)
 *
 * Fire-and-forget logging of every LLM API call to Supabase.
 * Never blocks the response — all errors are silently caught.
 *
 * @module llm-logger
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Anthropic pricing per 1M tokens (as of 2025) ───
const COST_PER_1M_INPUT: Record<string, number> = {
  "claude-sonnet-4-20250514": 3.0,
  "claude-opus-4-20250514": 15.0,
  "claude-haiku-3-5-20241022": 0.8,
};
const COST_PER_1M_OUTPUT: Record<string, number> = {
  "claude-sonnet-4-20250514": 15.0,
  "claude-opus-4-20250514": 75.0,
  "claude-haiku-3-5-20241022": 4.0,
};

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const inputRate = COST_PER_1M_INPUT[model] ?? 3.0;
  const outputRate = COST_PER_1M_OUTPUT[model] ?? 15.0;
  return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
}

export interface LLMCallParams {
  sessionId?: string;
  userId?: string | null;
  model: string;
  phase: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  wasCached?: boolean;
  wasCrisisIntercepted?: boolean;
  wasModelFallback?: boolean;
  fallbackReason?: string;
}

/**
 * Log an LLM call to Supabase. Fire-and-forget.
 * Uses service role client to bypass RLS.
 */
export async function logLLMCall(params: LLMCallParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    const costUsd = params.wasCached
      ? 0
      : calculateCost(params.model, params.inputTokens, params.outputTokens);

    await supabase.from("llm_call_logs").insert({
      session_id: params.sessionId || null,
      user_id: params.userId || null,
      model_used: params.model,
      phase: params.phase,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      latency_ms: params.latencyMs,
      cost_usd: costUsd,
      was_cached: params.wasCached ?? false,
      was_crisis_intercepted: params.wasCrisisIntercepted ?? false,
      was_model_fallback: params.wasModelFallback ?? false,
      fallback_reason: params.fallbackReason || null,
    });
  } catch {
    // Fire-and-forget: never block the response on logging failure
  }
}

/**
 * Log a structured event. Fire-and-forget.
 */
export async function logEvent(params: {
  eventType: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  latencyMs?: number;
  userId?: string | null;
  ipHash?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) return;

    await supabase.from("event_logs").insert({
      event_type: params.eventType,
      endpoint: params.endpoint || null,
      method: params.method || null,
      status_code: params.statusCode || null,
      latency_ms: params.latencyMs || null,
      user_id: params.userId || null,
      ip_hash: params.ipHash || null,
      metadata: params.metadata || {},
    });
  } catch {
    // Fire-and-forget
  }
}
