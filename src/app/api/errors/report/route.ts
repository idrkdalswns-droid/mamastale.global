/**
 * Client-side Error Reporting Endpoint
 *
 * Receives error reports from the browser and logs them to event_logs.
 * Rate limited: 10 reports per minute per IP.
 *
 * @module error-report
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { parseClientErrorReport } from "@/lib/utils/error-tracker";
import { logEvent } from "@/lib/utils/llm-logger";
import { getClientIP } from "@/lib/utils/validation";

// Simple in-memory rate limit for error reports
const reportMap = new Map<string, { count: number; reset: number }>();

function checkReportLimit(ip: string): boolean {
  const now = Date.now();
  // P1-FIX: Lazy cleanup to prevent unbounded memory growth
  if (reportMap.size > 300) {
    for (const [k, v] of reportMap) {
      if (now > v.reset) reportMap.delete(k);
    }
  }
  const entry = reportMap.get(ip);
  if (!entry || now > entry.reset) {
    reportMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!checkReportLimit(ip)) {
    return NextResponse.json({ error: "too many reports" }, { status: 429 });
  }

  // LAUNCH-FIX: Body size limit (error reports with stack traces, 32KB max)
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 32_000) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = parseClientErrorReport(body);
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: "invalid report" }, { status: 400 });
  }

  // Fire-and-forget logging
  logEvent({
    eventType: "client_error",
    endpoint: result.data.url,
    metadata: {
      message: result.data.message,
      source: result.data.source,
      stack: result.data.stack,
      userAgent: result.data.userAgent,
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
