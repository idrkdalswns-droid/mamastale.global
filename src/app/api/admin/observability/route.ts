/**
 * LLM Observability Dashboard API
 *
 * Returns aggregated metrics from llm_call_logs for the admin dashboard.
 * Protected: requires authenticated user with admin role.
 *
 * Query params:
 *   ?period=7d|30d|24h (default: 7d)
 *
 * @module admin-observability
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getClientIP } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

// Admin user IDs (hardcoded for now — move to env/DB later)
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

const adminLimiter = createInMemoryLimiter(RATE_KEYS.ADMIN, { maxEntries: 50 });

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  if (!adminLimiter.check(ip, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  // ─── Auth check ───
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Try Bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const { data: tokenData } = await supabase.auth.getUser(authHeader.slice(7));
    if (!tokenData.user || !ADMIN_USER_IDS.includes(tokenData.user.id)) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }
  } else if (!ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  // ─── Service role client for reading logs ───
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const adminClient = createServerClient(supabaseUrl, serviceKey, {
    cookies: { getAll() { return []; }, setAll() {} },
  });

  // ─── Period parsing ───
  const period = request.nextUrl.searchParams.get("period") || "7d";
  const now = new Date();
  let since: Date;
  switch (period) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: // 7d
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const sinceISO = since.toISOString();

  try {
    // ─── Fetch raw logs ───
    const { data: logs, error: logsError } = await adminClient
      .from("llm_call_logs")
      .select("model_used, phase, input_tokens, output_tokens, cost_usd, latency_ms, was_cached, was_crisis_intercepted, was_model_fallback, created_at")
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (logsError) {
      return NextResponse.json({ error: "로그 조회 실패" }, { status: 500 });
    }

    const safeData = logs || [];

    // ─── Aggregate metrics ───
    const totalCalls = safeData.length;
    const totalInputTokens = safeData.reduce((sum, l) => sum + (l.input_tokens || 0), 0);
    const totalOutputTokens = safeData.reduce((sum, l) => sum + (l.output_tokens || 0), 0);
    const totalCostUsd = safeData.reduce((sum, l) => sum + (l.cost_usd || 0), 0);
    const avgLatencyMs = totalCalls > 0
      ? Math.round(safeData.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalCalls)
      : 0;
    const cachedCount = safeData.filter(l => l.was_cached).length;
    const crisisCount = safeData.filter(l => l.was_crisis_intercepted).length;
    const fallbackCount = safeData.filter(l => l.was_model_fallback).length;

    // ─── Per-model breakdown ───
    const byModel: Record<string, { calls: number; cost: number; tokens: number }> = {};
    for (const l of safeData) {
      const m = l.model_used || "unknown";
      if (!byModel[m]) byModel[m] = { calls: 0, cost: 0, tokens: 0 };
      byModel[m].calls++;
      byModel[m].cost += l.cost_usd || 0;
      byModel[m].tokens += (l.input_tokens || 0) + (l.output_tokens || 0);
    }

    // ─── Per-phase breakdown ───
    const byPhase: Record<number, { calls: number; cost: number; avgLatency: number }> = {};
    for (const l of safeData) {
      const p = l.phase || 0;
      if (!byPhase[p]) byPhase[p] = { calls: 0, cost: 0, avgLatency: 0 };
      byPhase[p].calls++;
      byPhase[p].cost += l.cost_usd || 0;
      byPhase[p].avgLatency += l.latency_ms || 0;
    }
    for (const p of Object.keys(byPhase)) {
      const phase = byPhase[Number(p)];
      phase.avgLatency = phase.calls > 0 ? Math.round(phase.avgLatency / phase.calls) : 0;
    }

    // ─── Daily breakdown (for chart) ───
    const byDay: Record<string, { calls: number; cost: number; tokens: number }> = {};
    for (const l of safeData) {
      const day = (l.created_at as string).slice(0, 10); // YYYY-MM-DD
      if (!byDay[day]) byDay[day] = { calls: 0, cost: 0, tokens: 0 };
      byDay[day].calls++;
      byDay[day].cost += l.cost_usd || 0;
      byDay[day].tokens += (l.input_tokens || 0) + (l.output_tokens || 0);
    }

    // ─── Recent events (error monitoring) ───
    const { data: events } = await adminClient
      .from("event_logs")
      .select("event_type, endpoint, metadata, created_at")
      .gte("created_at", sinceISO)
      .in("event_type", ["error", "crisis_detection", "output_safety_violation"])
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      period,
      summary: {
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        avgLatencyMs,
        cachedCount,
        cacheHitRate: totalCalls > 0 ? Math.round((cachedCount / totalCalls) * 100) : 0,
        crisisCount,
        fallbackCount,
      },
      byModel,
      byPhase,
      byDay,
      recentEvents: events || [],
    });
  } catch (err) {
    // R10-FIX: Use err.name (not err.message) to prevent internal detail leakage in logs
    console.error("[Admin] Observability aggregation failed:", err instanceof Error ? err.name : "Unknown");
    return NextResponse.json({ error: "집계 중 오류 발생" }, { status: 500 });
  }
}
