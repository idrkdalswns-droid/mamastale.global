/**
 * Teacher Mode — 내 동화 목록/공유 서재 API + 수동 동화 생성
 *
 * GET:  인증 사용자의 teacher_stories 목록 반환 (최신순)
 * GET ?scope=shared: 같은 teacher_code 그룹의 전체 동화 반환
 * POST: 수동 동화 생성 (직접 작성)
 *
 * @module teacher-stories
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { containsProfanity, sanitizeSceneText } from "@/lib/utils/validation";
import { t } from "@/lib/i18n";

const teacherStoryPostSchema = z.object({
  title: z.string({ required_error: t("Errors.teacher.titleRequired") })
    .min(1, t("Errors.teacher.titleRequired"))
    .transform(s => s.trim().slice(0, 200)),
  spreads: z.array(z.object({
    spreadNumber: z.number().optional(),
    title: z.string().transform(s => s.slice(0, 200)).optional(),
    text: z.string({ required_error: t("Errors.teacher.sceneContentRequired") })
      .transform(s => s.slice(0, 5000)),
  })).min(1, t("Errors.teacher.sceneMinRequired")).max(20, t("Errors.teacher.sceneMaxExceeded")),
});

const limiter = createInMemoryLimiter("teacher_stories");

export async function GET(request: NextRequest) {
  // 1. Supabase 클라이언트
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  // 2. 인증
  const user = await resolveUser(sb.client, request);
  if (!user) {
    return NextResponse.json(
      { error: t("Errors.auth.loginRequired") },
      { status: 401 }
    );
  }

  // 3. scope 파라미터 확인
  const scope = request.nextUrl.searchParams.get("scope");

  // 4-A. scope=shared: 같은 code 그룹 전체 동화 (RLS shared_library_read가 자동 필터링)
  if (scope === "shared") {
    const { data: stories, error } = await sb.client
      .from("teacher_stories")
      .select("id, session_id, title, spreads, metadata, brief_context, cover_image, source, created_at, teacher_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Teacher Stories] Shared query failed:", error);
      return sb.applyCookies(
        NextResponse.json({ error: t("Errors.story.sharedListFailed") }, { status: 500 })
      );
    }

    return sb.applyCookies(
      NextResponse.json({
        stories: (stories || []).map((s: Record<string, unknown>) => ({
          id: s.id,
          session_id: s.session_id,
          title: s.title,
          spreads: s.spreads,
          metadata: s.metadata,
          brief_context: s.brief_context,
          cover_image: s.cover_image || null,
          source: s.source || "ai",
          created_at: s.created_at,
          is_mine: s.teacher_id === user.id,
          author: s.teacher_id === user.id ? "나" : "다른 선생님",
        })),
      })
    );
  }

  // 4-B. 기본: 내 동화만 (기존 동작, 하위호환 + soft-delete 필터)
  const { data: stories, error } = await sb.client
    .from("teacher_stories")
    .select("id, session_id, title, spreads, metadata, brief_context, cover_image, source, created_at, updated_at")
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Teacher Stories] Query failed:", error);
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.story.listLoadFailed") }, { status: 500 })
    );
  }

  return sb.applyCookies(
    NextResponse.json({
      stories: (stories || []).map((s: Record<string, unknown>) => ({
        id: s.id,
        session_id: s.session_id,
        title: s.title,
        spreads: s.spreads,
        metadata: s.metadata,
        brief_context: s.brief_context,
        cover_image: s.cover_image || null,
        source: s.source || "ai",
        created_at: s.created_at,
      })),
    })
  );
}

// ─── POST: 수동 동화 생성 ───

export async function POST(request: NextRequest) {
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

  if (!limiter.check(`post:${user.id}`, 10, 60_000)) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.rateLimit.tooManyRequestsShort") }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  // Body size limit
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 512_000) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.requestTooLarge") }, { status: 413 })
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 })
    );
  }

  const parsed = teacherStoryPostSchema.safeParse(body);
  if (!parsed.success) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.invalidFormat") }, { status: 400 })
    );
  }

  const { title, spreads } = parsed.data;

  if (!title) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.teacher.titleRequiredDot") }, { status: 400 })
    );
  }
  if (containsProfanity(title)) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.profanity.title") }, { status: 400 })
    );
  }

  const sanitizedSpreads = [];
  for (let i = 0; i < spreads.length; i++) {
    const s = spreads[i];
    const text = sanitizeSceneText(s.text);
    if (containsProfanity(text)) {
      return sb.applyCookies(
        NextResponse.json({ error: `장면 ${i + 1}에 부적절한 표현이 포함되어 있습니다.` }, { status: 400 })
      );
    }
    sanitizedSpreads.push({
      spreadNumber: s.spreadNumber ?? i + 1,
      title: s.title ? sanitizeSceneText(s.title) : undefined,
      text,
    });
  }

  // 교사의 최신 활성 세션 찾기
  const { data: latestSession } = await sb.client
    .from("teacher_sessions")
    .select("id, code")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestSession) {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.teacher.sessionRequired") },
        { status: 400 }
      )
    );
  }

  // Insert
  const { data: story, error } = await sb.client
    .from("teacher_stories")
    .insert({
      session_id: latestSession.id,
      teacher_id: user.id,
      title,
      spreads: sanitizedSpreads,
      metadata: {},
      brief_context: {},
      source: "manual",
    })
    .select("id, title")
    .single();

  if (error) {
    console.error("[Teacher Story POST] Insert error:", error.code, error.message);
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.story.saveFailed") }, { status: 500 })
    );
  }

  return sb.applyCookies(
    NextResponse.json({ id: story.id, title: story.title }, { status: 201 })
  );
}
