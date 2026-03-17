export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { z } from "zod";

/** Layer 1: API 경계 Zod 검증 — 인젝션 1차 방어선 */
const onboardingSchema = z
  .object({
    ageGroup: z
      .enum(["infant", "toddler", "kindergarten", "mixed"])
      .optional(),
    context: z
      .enum(["large_group", "small_group", "free_choice", "home_connection"])
      .optional(),
    topic: z.string().max(50).optional(), // 클라이언트 maxLength={50}과 일치
    characterType: z
      .enum(["animal", "child", "object", "fantasy", "auto"])
      .optional(),
    situation: z.string().max(200).optional(), // 클라이언트 maxLength={200}과 일치
  })
  .strict();

/**
 * GET /api/teacher/session — 세션 복구 (auth.uid() 기반)
 * 활성 세션이 있으면 대화 히스토리 + Phase 반환
 */
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  // 활성 세션 조회 (가장 최근)
  const { data: session } = await sb.client
    .from("teacher_sessions")
    .select("id, expires_at, current_phase, turn_count, onboarding, stories_created")
    .eq("teacher_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    return sb.applyCookies(
      NextResponse.json({ session: null })
    );
  }

  // 대화 히스토리 로드
  const { data: messages } = await sb.client
    .from("teacher_messages")
    .select("id, role, content, phase, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  return sb.applyCookies(
    NextResponse.json({
      session: {
        id: session.id,
        expiresAt: session.expires_at,
        currentPhase: session.current_phase,
        turnCount: session.turn_count,
        onboarding: session.onboarding,
        storiesCreated: session.stories_created,
      },
      messages: messages || [],
    })
  );
}

/**
 * PATCH /api/teacher/session — 온보딩 데이터 업데이트
 */
export async function PATCH(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
    );
  }

  const sessionId =
    typeof raw.sessionId === "string" ? raw.sessionId : undefined;
  if (!sessionId || !raw.onboarding) {
    return sb.applyCookies(
      NextResponse.json(
        { error: "sessionId와 onboarding 데이터가 필요합니다." },
        { status: 400 }
      )
    );
  }

  // Layer 1: Zod 검증 — 구조적 검증 + 길이 제한
  let onboarding: z.infer<typeof onboardingSchema>;
  try {
    onboarding = onboardingSchema.parse(raw.onboarding);
  } catch (zodError) {
    console.warn(
      "[Teacher] Onboarding validation failed:",
      zodError instanceof z.ZodError ? zodError.issues : zodError
    );
    return sb.applyCookies(
      NextResponse.json(
        { error: "온보딩 데이터 형식이 올바르지 않습니다." },
        { status: 400 }
      )
    );
  }

  // 세션 소유권 + 만료 확인
  const { data: session } = await sb.client
    .from("teacher_sessions")
    .select("id, expires_at")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (!session) {
    return sb.applyCookies(
      NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 })
    );
  }

  if (new Date(session.expires_at) < new Date()) {
    return sb.applyCookies(
      NextResponse.json({ error: "세션이 만료되었습니다." }, { status: 401 })
    );
  }

  // 온보딩 데이터 업데이트 (Zod 검증 통과한 데이터만 저장)
  const { error: updateError } = await sb.client
    .from("teacher_sessions")
    .update({ onboarding })
    .eq("id", sessionId)
    .eq("teacher_id", user.id);

  if (updateError) {
    console.error("[Teacher] Onboarding update failed:", updateError.message);
    return sb.applyCookies(
      NextResponse.json(
        { error: "업데이트에 실패했습니다." },
        { status: 500 }
      )
    );
  }

  return sb.applyCookies(
    NextResponse.json({ success: true })
  );
}
