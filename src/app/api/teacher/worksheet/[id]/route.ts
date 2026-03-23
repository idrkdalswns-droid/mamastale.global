/**
 * Teacher Worksheet Detail API
 *
 * GET /api/teacher/worksheet/{id}
 * Returns full worksheet data including html_content for re-download/print.
 *
 * @module api/teacher/worksheet/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // 3. Parse id
  const { id } = await params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 활동지 ID입니다." }, { status: 400 })
    );
  }

  // 4. Query (RLS filters by user_id automatically)
  const { data, error } = await sb.client
    .from("worksheet_outputs")
    .select("id, activity_type, html_content, params, nuri_domains, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return sb.applyCookies(
      NextResponse.json({ error: "활동지를 찾을 수 없습니다." }, { status: 404 })
    );
  }

  return sb.applyCookies(
    NextResponse.json(data)
  );
}
