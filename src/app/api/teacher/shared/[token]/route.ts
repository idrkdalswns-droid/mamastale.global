/**
 * Teacher Shared Story — 공개 조회 API
 *
 * GET /api/teacher/shared/[token]
 * 공유 토큰으로 동화 조회 (인증 불필요).
 * Service role로 RLS 우회하여 조회.
 *
 * @module teacher-shared-story
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { getClientIP } from "@/lib/utils/validation";
import { t } from "@/lib/i18n";

const limiter = createInMemoryLimiter("teacher_shared");

// UUID v4 format check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Validate token format
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: t("Errors.validation.invalidLink") }, { status: 400 });
  }

  // 2. Rate limiting (IP-based, public endpoint)
  const ip = getClientIP(request);
  if (!limiter.check(ip, 30, 60_000)) {
    return NextResponse.json(
      { error: t("Errors.rateLimit.tooManyRequestsShort") },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 3. Service role client (bypass RLS for public access)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const supabase = createServerClient(supabaseUrl, serviceKey, {
    cookies: { getAll() { return []; }, setAll() {} },
  });

  // 4. Query by share_token — R6: include expiry check in WHERE to avoid loading expired stories
  const { data: story, error } = await supabase
    .from("teacher_stories")
    .select("id, title, spreads, metadata, brief_context, cover_image, created_at")
    .eq("share_token", token)
    .is("deleted_at", null)
    .gt("share_expires_at", new Date().toISOString())
    .single();

  if (error || !story) {
    return NextResponse.json(
      { error: t("Errors.story.notFoundOrExpired") },
      { status: 404 }
    );
  }

  // 6. Return story data (no sensitive info)
  return NextResponse.json({
    id: story.id,
    title: story.title,
    spreads: story.spreads,
    coverImage: story.cover_image || null,
    createdAt: story.created_at,
    // Extract age info for display
    ageGroup: (story.brief_context as Record<string, unknown>)?.targetAge || null,
  });
}
