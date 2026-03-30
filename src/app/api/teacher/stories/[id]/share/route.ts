/**
 * Teacher Story Share — 공유 링크 생성/조회/해제
 *
 * POST /api/teacher/stories/[id]/share — 공유 토큰 생성 (30일 만료)
 * DELETE /api/teacher/stories/[id]/share — 공유 해제
 *
 * @module teacher-story-share
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { isValidUUID } from "@/lib/utils/validation";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { logEvent } from "@/lib/utils/llm-logger";
import { t } from "@/lib/i18n";

const limiter = createInMemoryLimiter("teacher_story_share");

const SHARE_DURATION_DAYS = 30;

// ─── POST: 공유 링크 생성 ───

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
    );
  }

  if (!limiter.check(`share:${user.id}`, 10, 60_000)) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.rateLimit.tooManyRequestsShort") }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  // Check ownership + existing share token
  const { data: story, error } = await sb.client
    .from("teacher_stories")
    .select("id, share_token, share_expires_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !story) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.story.notFound") }, { status: 404 })
    );
  }

  // If already shared and not expired, return existing token
  if (
    story.share_token &&
    story.share_expires_at &&
    new Date(story.share_expires_at) > new Date()
  ) {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://mamastale-global.pages.dev";
    return sb.applyCookies(
      NextResponse.json({
        shareToken: story.share_token,
        shareUrl: `${siteUrl}/community/teacher/${story.share_token}`,
        expiresAt: story.share_expires_at,
      })
    );
  }

  // Generate new token
  const shareToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SHARE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await sb.client
    .from("teacher_stories")
    .update({ share_token: shareToken, share_expires_at: expiresAt })
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (updateError) {
    console.error("[Teacher Share] Token update failed:", updateError.message);
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.teacher.shareLinkFailed") }, { status: 500 })
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://mamastale-global.pages.dev";

  // R7: Audit log for share token creation
  logEvent({
    eventType: "teacher_share_created",
    endpoint: `/api/teacher/stories/${id}/share`,
    method: "POST",
    statusCode: 200,
    userId: user.id,
    metadata: { storyId: id, expiresAt },
  });

  return sb.applyCookies(
    NextResponse.json({
      shareToken,
      shareUrl: `${siteUrl}/community/teacher/${shareToken}`,
      expiresAt,
    })
  );
}

// ─── DELETE: 공유 해제 ───

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
    );
  }

  const { error } = await sb.client
    .from("teacher_stories")
    .update({ share_token: null, share_expires_at: null })
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (error) {
    console.error("[Teacher Share] Unshare failed:", error.message);
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.teacher.unshareFailed") }, { status: 500 })
    );
  }

  return sb.applyCookies(NextResponse.json({ success: true }));
}
