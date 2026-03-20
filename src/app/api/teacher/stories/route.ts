/**
 * Teacher Mode — 내 동화 목록/공유 서재 API
 *
 * GET: 인증 사용자의 teacher_stories 목록 반환 (최신순)
 * GET ?scope=shared: 같은 teacher_code 그룹의 전체 동화 반환
 *
 * @module teacher-stories
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export async function GET(request: NextRequest) {
  // 1. Supabase 클라이언트
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // 2. 인증
  const user = await resolveUser(sb.client, request);
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 3. scope 파라미터 확인
  const scope = request.nextUrl.searchParams.get("scope");

  // 4-A. scope=shared: 같은 code 그룹 전체 동화 (RLS shared_library_read가 자동 필터링)
  if (scope === "shared") {
    const { data: stories, error } = await sb.client
      .from("teacher_stories")
      .select("id, session_id, title, spreads, metadata, brief_context, cover_image, created_at, teacher_id")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Teacher Stories] Shared query failed:", error);
      return sb.applyCookies(
        NextResponse.json({ error: "공유 동화를 불러오지 못했습니다." }, { status: 500 })
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
          created_at: s.created_at,
          is_mine: s.teacher_id === user.id,
          author: s.teacher_id === user.id ? "나" : "다른 선생님",
        })),
      })
    );
  }

  // 4-B. 기본: 내 동화만 (기존 동작, 하위호환)
  const { data: stories, error } = await sb.client
    .from("teacher_stories")
    .select("id, session_id, title, spreads, metadata, brief_context, created_at, updated_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Teacher Stories] Query failed:", error);
    return sb.applyCookies(
      NextResponse.json({ error: "동화 목록을 불러오지 못했습니다." }, { status: 500 })
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
        created_at: s.created_at,
      })),
    })
  );
}
