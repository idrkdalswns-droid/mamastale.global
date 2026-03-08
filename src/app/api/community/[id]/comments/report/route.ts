import { NextRequest, NextResponse } from "next/server";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// ─── Rate limiting for comment reports (prevent spam abuse) ───
const REPORT_RATE_WINDOW = 300_000; // 5 minutes
const REPORT_RATE_LIMIT = 10; // max 10 reports per 5 min per IP
const reportRateMap = new Map<string, { count: number; resetAt: number }>();

function checkReportRate(key: string): boolean {
  const now = Date.now();
  if (reportRateMap.size > 300) {
    for (const [k, v] of reportRateMap) {
      if (now > v.resetAt) reportRateMap.delete(k);
    }
  }
  const entry = reportRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    reportRateMap.set(key, { count: 1, resetAt: now + REPORT_RATE_WINDOW });
    return true;
  }
  if (entry.count >= REPORT_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  // Rate limit by IP
  const ip = getClientIP(request);
  if (!checkReportRate(ip)) {
    return NextResponse.json(
      { error: "신고 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  if (!isValidUUID(storyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Use createApiSupabaseClient to preserve session cookies on auth refresh
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 }));
  }

  try {
    // LAUNCH-FIX: Body size limit (report payloads are tiny, 4KB max)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 4_000) {
      return sb.applyCookies(NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 }));
    }

    const { commentId } = body;
    if (!commentId || !isValidUUID(commentId)) {
      return sb.applyCookies(NextResponse.json({ error: "commentId 필요" }, { status: 400 }));
    }

    // IL-11: Verify comment belongs to the specified story
    const { data: comment } = await sb.client
      .from("comments")
      .select("id")
      .eq("id", commentId)
      .eq("story_id", storyId)
      .maybeSingle();

    if (!comment) {
      return sb.applyCookies(NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 }));
    }

    // CTO-FIX: Check insert result and handle duplicates gracefully
    const { error: insertErr } = await sb.client
      .from("comment_reports")
      .insert({
        comment_id: commentId,
        reporter_id: user.id,
        story_id: storyId,
      });

    // 23505 = unique constraint violation (already reported) — treat as success
    if (insertErr && insertErr.code !== "23505") {
      console.error("[Report] Insert error:", insertErr.code);
      return sb.applyCookies(NextResponse.json({ error: "신고 처리에 실패했습니다." }, { status: 500 }));
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: "신고 처리 실패" }, { status: 500 }));
  }
}
