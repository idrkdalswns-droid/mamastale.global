/**
 * Teacher Worksheet List API
 *
 * GET /api/teacher/worksheet?story_id={uuid}
 * Returns worksheet history for a given story (excluding html_content for size).
 *
 * @module api/teacher/worksheet
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  // 1. Supabase client
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB를 사용할 수 없습니다." }, { status: 503 });
  }

  // 2. Auth
  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  // 3. Parse story_id from query
  const storyId = request.nextUrl.searchParams.get("story_id");
  if (!storyId) {
    return sb.applyCookies(
      NextResponse.json({ error: "story_id가 필요합니다." }, { status: 400 })
    );
  }

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(storyId)) {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 story_id 형식입니다." }, { status: 400 })
    );
  }

  // 4. Query worksheet_outputs (RLS filters by user_id automatically)
  // Exclude html_content to reduce payload size
  const { data, error } = await sb.client
    .from("worksheet_outputs")
    .select("id, activity_type, params, nuri_domains, created_at, generation_time_ms")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[worksheet/list] Query failed:", error.message);
    return sb.applyCookies(
      NextResponse.json({ error: "활동지 목록을 불러올 수 없습니다." }, { status: 500 })
    );
  }

  return sb.applyCookies(
    NextResponse.json({ worksheets: data || [] })
  );
}
