export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { logEvent } from "@/lib/utils/llm-logger";
import { z } from "zod";
import { t } from "@/lib/i18n";

const sessionDeleteLimiter = createInMemoryLimiter("teacher_session_delete", { maxEntries: 200 });

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
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
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
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 })
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 })
    );
  }

  const sessionId =
    typeof raw.sessionId === "string" ? raw.sessionId : undefined;
  if (!sessionId) {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.validation.sessionIdRequired") },
        { status: 400 }
      )
    );
  }

  // 업데이트 페이로드 구성 (onboarding / currentPhase / expiresAt 선택적)
  const updatePayload: Record<string, unknown> = {};

  if (raw.onboarding) {
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
          { error: t("Errors.validation.invalidOnboardingFormat") },
          { status: 400 }
        )
      );
    }
    updatePayload.onboarding = onboarding;
  }

  if (typeof raw.currentPhase === "string" &&
      ["A", "B", "C", "D", "E", "DONE"].includes(raw.currentPhase)) {
    updatePayload.current_phase = raw.currentPhase;
  }

  if (typeof raw.expiresAt === "string") {
    // 보안: 과거 시간만 허용 (세션 강제 만료 전용)
    if (new Date(raw.expiresAt) > new Date()) {
      return sb.applyCookies(
        NextResponse.json(
          { error: t("Errors.teacher.sessionExtendNotAllowed") },
          { status: 400 }
        )
      );
    }
    updatePayload.expires_at = raw.expiresAt;
  }

  if (Object.keys(updatePayload).length === 0) {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.validation.updateDataRequired") },
        { status: 400 }
      )
    );
  }

  // 세션 소유권 확인
  const { data: session } = await sb.client
    .from("teacher_sessions")
    .select("id, expires_at")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (!session) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.teacher.sessionNotFound") }, { status: 404 })
    );
  }

  // T-B1: 만료 확인 — expiresAt 업데이트(강제 만료) 시에는 스킵
  if (!updatePayload.expires_at && new Date(session.expires_at) < new Date()) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.teacher.sessionExpired") }, { status: 410 })
    );
  }

  // 업데이트 실행
  const { error: updateError } = await sb.client
    .from("teacher_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("teacher_id", user.id);

  if (updateError) {
    console.error("[Teacher] Session update failed:", updateError.message);
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.system.updateFailed") },
        { status: 500 }
      )
    );
  }

  return sb.applyCookies(
    NextResponse.json({ success: true })
  );
}

/**
 * DELETE /api/teacher/session — 세션 종료 (soft delete: expires_at = NOW)
 * B1: 프론트(TeacherCodeModal)에서 "새로 시작하기" 시 호출
 */
export async function DELETE(request: NextRequest) {
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

  // Rate limit: 5/min per user
  if (!sessionDeleteLimiter.check(user.id, 5, 60_000)) {
    return sb.applyCookies(
      NextResponse.json(
        { error: t("Errors.rateLimit.retryAfterMinute") },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    );
  }

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 })
    );
  }

  const sessionId = body.sessionId;
  if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.validation.validSessionIdRequired") }, { status: 400 })
    );
  }

  // 소유권 확인 + soft delete (expires_at = NOW)
  const { error: updateError, count } = await sb.client
    .from("teacher_sessions")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("teacher_id", user.id);

  if (updateError) {
    console.error("[Teacher] Session delete failed:", updateError.message);
    return sb.applyCookies(
      NextResponse.json({ error: t("Errors.teacher.sessionEndFailed") }, { status: 500 })
    );
  }

  // R7: Audit log for session termination
  logEvent({
    eventType: "teacher_session_ended",
    endpoint: "/api/teacher/session",
    method: "DELETE",
    statusCode: 200,
    userId: user.id,
    metadata: { sessionId },
  });

  return sb.applyCookies(
    NextResponse.json({ success: true })
  );
}
