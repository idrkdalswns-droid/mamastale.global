/**
 * Teacher Mode — 개별 동화 API (GET / PATCH / DELETE)
 *
 * GET:    단일 동화 조회 (RLS 기반 소유권)
 * PATCH:  부분 업데이트 (제목, 스프레드, 표지)
 * DELETE: soft-delete (deleted_at 설정)
 *
 * @module teacher-story-detail
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { isValidUUID, containsProfanity, sanitizeSceneText, isValidCoverImage } from "@/lib/utils/validation";
import { logEvent } from "@/lib/utils/llm-logger";

const limiter = createInMemoryLimiter("teacher_story_detail");

// ─── GET: 단일 동화 조회 ───

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  if (!limiter.check(`get:${user.id}`, 30, 60_000)) {
    return sb.applyCookies(
      NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  const { data: story, error } = await sb.client
    .from("teacher_stories")
    .select("id, session_id, title, spreads, metadata, brief_context, cover_image, source, created_at, updated_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !story) {
    return sb.applyCookies(
      NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 })
    );
  }

  return sb.applyCookies(NextResponse.json({ story }));
}

// ─── PATCH: 부분 업데이트 ───

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  if (!limiter.check(`patch:${user.id}`, 10, 60_000)) {
    return sb.applyCookies(
      NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  // Body size limit
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 512_000) {
    return sb.applyCookies(
      NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 })
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
    );
  }

  const updates: Record<string, unknown> = {};

  // title (optional)
  if (typeof body.title === "string") {
    const safeTitle = body.title.trim().slice(0, 200);
    if (safeTitle && containsProfanity(safeTitle)) {
      return sb.applyCookies(
        NextResponse.json({ error: "부적절한 표현이 포함된 제목입니다." }, { status: 400 })
      );
    }
    updates.title = safeTitle || null;
  }

  // spreads (optional) — 부분 업데이트: undefined면 무시
  if (Array.isArray(body.spreads)) {
    if (body.spreads.length === 0 || body.spreads.length > 20) {
      return sb.applyCookies(
        NextResponse.json({ error: "장면은 1~20개 사이여야 합니다." }, { status: 400 })
      );
    }

    const validSpreads = body.spreads.every(
      (s: unknown) =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Record<string, unknown>).spreadNumber === "number" &&
        typeof (s as Record<string, unknown>).text === "string"
    );

    if (!validSpreads) {
      return sb.applyCookies(
        NextResponse.json({ error: "잘못된 장면 형식입니다." }, { status: 400 })
      );
    }

    // Sanitize + profanity check
    const sanitizedSpreads = [];
    for (const s of body.spreads as Array<{ spreadNumber: number; title?: string; text: string }>) {
      const cleanText = sanitizeSceneText(s.text.slice(0, 5000));
      if (containsProfanity(cleanText)) {
        return sb.applyCookies(
          NextResponse.json({ error: "부적절한 표현이 포함되어 있습니다." }, { status: 400 })
        );
      }
      sanitizedSpreads.push({
        spreadNumber: sanitizedSpreads.length + 1, // M5: 순차 번호 강제 할당
        title: s.title ? sanitizeSceneText(s.title.slice(0, 200)) : undefined,
        text: cleanText,
      });
    }

    updates.spreads = sanitizedSpreads;
  }

  // cover_image (optional) — T-B14: Use strict host whitelist validation
  if (typeof body.cover_image === "string" && isValidCoverImage(body.cover_image)) {
    updates.cover_image = body.cover_image;
  }

  if (Object.keys(updates).length === 0) {
    return sb.applyCookies(
      NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 })
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await sb.client
    .from("teacher_stories")
    .update(updates)
    .eq("id", id)
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[Teacher Story PATCH] Error:", error.code);
    return sb.applyCookies(
      NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 })
    );
  }

  if (!updated) {
    return sb.applyCookies(
      NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 })
    );
  }

  return sb.applyCookies(NextResponse.json({ success: true }));
}

// ─── DELETE: soft-delete ───

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  if (!limiter.check(`delete:${user.id}`, 10, 60_000)) {
    return sb.applyCookies(
      NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429, headers: { "Retry-After": "60" } })
    );
  }

  // Soft-delete: set deleted_at (소유권 이중 검증)
  const { data: deleted, error } = await sb.client
    .from("teacher_stories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[Teacher Story DELETE] Error:", error.code, error.message, "storyId:", id, "userId:", user.id.slice(0, 8));
    return sb.applyCookies(
      NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 })
    );
  }

  if (!deleted) {
    return sb.applyCookies(
      NextResponse.json({ error: "동화를 찾을 수 없거나 이미 삭제되었습니다." }, { status: 404 })
    );
  }

  // R7: Audit log for story deletion
  logEvent({
    eventType: "teacher_story_deleted",
    endpoint: `/api/teacher/stories/${id}`,
    method: "DELETE",
    statusCode: 200,
    userId: user.id,
    metadata: { storyId: id },
  });

  return sb.applyCookies(NextResponse.json({ success: true }));
}
