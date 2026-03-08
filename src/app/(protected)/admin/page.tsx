"use client";

import { useState, useEffect, useCallback } from "react";

interface Summary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  cachedCount: number;
  cacheHitRate: number;
  crisisCount: number;
  fallbackCount: number;
}

interface ModelBreakdown {
  calls: number;
  cost: number;
  tokens: number;
}

interface PhaseBreakdown {
  calls: number;
  cost: number;
  avgLatency: number;
}

interface DayBreakdown {
  calls: number;
  cost: number;
  tokens: number;
}

interface RecentEvent {
  event_type: string;
  endpoint: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface DashboardData {
  period: string;
  summary: Summary;
  byModel: Record<string, ModelBreakdown>;
  byPhase: Record<string, PhaseBreakdown>;
  byDay: Record<string, DayBreakdown>;
  recentEvents: RecentEvent[];
}

const PHASE_NAMES: Record<string, string> = {
  "1": "1 공감",
  "2": "2 소크라테스",
  "3": "3 은유",
  "4": "4 동화",
};

const MODEL_SHORT: Record<string, string> = {
  "claude-haiku-3-5-20241022": "Haiku 3.5",
  "claude-sonnet-4-20250514": "Sonnet 4",
  "claude-opus-4-20250514": "Opus 4",
  "crisis_bypass": "위기 바이패스",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    crisis_detection: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    output_safety_violation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[type] || "bg-gray-100 text-gray-600"}`}>
      {type}
    </span>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/observability?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="min-h-dvh bg-cream dark:bg-gray-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4 font-serif font-bold text-brown">X</p>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">접근 불가</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-dvh bg-cream dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    );
  }

  const { summary: s, byModel, byPhase, byDay, recentEvents } = data;

  // Sort daily data for display
  const sortedDays = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-dvh bg-cream dark:bg-gray-900 px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">📊 LLM 대시보드</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">mamastale 옵저버빌리티</p>
        </div>
        <div className="flex gap-1">
          {["24h", "7d", "30d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                period === p
                  ? "bg-coral text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <MetricCard label="총 호출" value={formatNumber(s.totalCalls)} />
        <MetricCard label="총 비용" value={`$${s.totalCostUsd.toFixed(2)}`} />
        <MetricCard label="평균 응답시간" value={`${s.avgLatencyMs}ms`} />
        <MetricCard label="캐시 히트율" value={`${s.cacheHitRate}%`} sub={`${s.cachedCount}건 캐시`} />
        <MetricCard label="총 토큰" value={formatNumber(s.totalInputTokens + s.totalOutputTokens)} sub={`입력 ${formatNumber(s.totalInputTokens)} / 출력 ${formatNumber(s.totalOutputTokens)}`} />
        <MetricCard label="위기 감지" value={`${s.crisisCount}건`} sub={`폴백 ${s.fallbackCount}건`} />
      </div>

      {/* Model Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">모델별 분포</h2>
        <div className="space-y-2">
          {Object.entries(byModel).map(([model, info]) => (
            <div key={model} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {MODEL_SHORT[model] || model.split("-").slice(1, 3).join(" ")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{info.calls}회</span>
                <span>${info.cost.toFixed(3)}</span>
                <span>{formatNumber(info.tokens)}tok</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Phase별 분포</h2>
        <div className="space-y-2">
          {Object.entries(byPhase)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([phase, info]) => (
              <div key={phase} className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {PHASE_NAMES[phase] || `Phase ${phase}`}
                </span>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{info.calls}회</span>
                  <span>${info.cost.toFixed(3)}</span>
                  <span>{info.avgLatency}ms</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Daily Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">일별 추이</h2>
        {sortedDays.length === 0 ? (
          <p className="text-xs text-gray-400">데이터 없음</p>
        ) : (
          <div className="space-y-1">
            {sortedDays.map(([day, info]) => {
              const maxCalls = Math.max(...sortedDays.map(([, d]) => d.calls), 1);
              const barWidth = Math.max(8, (info.calls / maxCalls) * 100);
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-16 shrink-0">{day.slice(5)}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-4 bg-coral/20 rounded-sm flex items-center"
                      style={{ width: `${barWidth}%` }}
                    >
                      <span className="text-[9px] text-coral font-medium px-1">{info.calls}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">${info.cost.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">최근 이벤트</h2>
        {recentEvents.length === 0 ? (
          <p className="text-xs text-gray-400">이벤트 없음</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.map((evt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <EventBadge type={evt.event_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 dark:text-gray-300 truncate">
                    {evt.endpoint || "—"}
                    {evt.metadata && typeof evt.metadata === "object" && "severity" in evt.metadata
                      ? ` · ${String(evt.metadata.severity)}`
                      : ""}
                  </p>
                  <p className="text-gray-400 text-[10px]">
                    {new Date(evt.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchData}
          className="text-xs text-coral underline underline-offset-2"
        >
          새로고침
        </button>
      </div>
    </div>
  );
}
