/**
 * Teacher Mode — 내 동화 목록/상세 API
 *
 * GET: 인증 사용자의 teacher_stories 목록 반환 (최신순)
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

  // 3. 동화 목록 조회 (RLS가 teacher_id = auth.uid() 필터링)
  const { data: stories, error } = await sb.client
    .from("teacher_stories")
    .select("id, title, spreads, metadata, brief_context, created_at, updated_at")
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
        title: s.title,
        spreadCount: Array.isArray(s.spreads) ? s.spreads.length : 0,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        // 목록에서는 전체 데이터 대신 요약만 반환
        briefContext: s.brief_context,
      })),
    })
  );
}
