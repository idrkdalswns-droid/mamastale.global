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
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

const errorReportLimiter = createInMemoryLimiter(RATE_KEYS.ERROR_REPORT);

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!errorReportLimiter.check(ip, 10, 60_000)) {
    return NextResponse.json({ error: "too many reports" }, { status: 429, headers: { "Retry-After": "60" } });
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
