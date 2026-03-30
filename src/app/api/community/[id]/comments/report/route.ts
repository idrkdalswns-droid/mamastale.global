import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidUUID, getClientIP } from "@/lib/utils/validation";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const reportSchema = z.object({
  commentId: z.string().uuid(),
});

const reportLimiter = createInMemoryLimiter(RATE_KEYS.COMMENT_REPORT);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  // Rate limit by IP (10 per 5min)
  const ip = getClientIP(request);
  if (!reportLimiter.check(ip, 10, 300_000)) {
    return NextResponse.json(
      { error: t("Errors.rateLimit.reportLimit") },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (!isValidUUID(storyId)) {
    return NextResponse.json({ error: t("Errors.validation.invalidIdFormat") }, { status: 400 });
  }

  // Use createApiSupabaseClient to preserve session cookies on auth refresh
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
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
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  try {
    // LAUNCH-FIX: Body size limit (report payloads are tiny, 4KB max)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 4_000) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.requestTooLarge") }, { status: 413 }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 }));
    }

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 }));
    }

    const { commentId } = parsed.data;

    // IL-11: Verify comment belongs to the specified story
    const { data: comment } = await sb.client
      .from("comments")
      .select("id")
      .eq("id", commentId)
      .eq("story_id", storyId)
      .maybeSingle();

    if (!comment) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.community.commentNotFound") }, { status: 404 }));
    }

    // CTO-FIX: Check insert result and handle duplicates gracefully
    const { error: insertErr } = await sb.client
      .from("comment_reports")
      .insert({
        comment_id: commentId,
        user_id: user.id,
        story_id: storyId,
      });

    // 23505 = unique constraint violation (already reported) — treat as success
    if (insertErr && insertErr.code !== "23505") {
      console.error("[Report] Insert error:", insertErr.code);
      return sb.applyCookies(NextResponse.json({ error: t("Errors.community.reportFailed") }, { status: 500 }));
    }

    return sb.applyCookies(NextResponse.json({ success: true }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.community.reportError") }, { status: 500 }));
  }
}
