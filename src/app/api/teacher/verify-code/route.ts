export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { logEvent } from "@/lib/utils/llm-logger";

const SESSION_DURATION_HOURS = 3;

export async function POST(request: NextRequest) {
  // 1. Supabase 클라이언트
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json(
      { error: "DB not configured" },
      { status: 503 }
    );
  }

  // 2. 인증 (로그인 필수)
  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  // 3. 유저+IP 기반 레이트 리미팅 (브루트포스 방어: 5회/분)
  // 학교 공유 WiFi 환경 대응: user.id + IP 조합으로 다른 선생님 차단 방지
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
  const ipWithinLimit = await checkRateLimitPersistent(
    `verify-code:${user.id}:${ip}`,
    5,
    60
  );
  if (!ipWithinLimit) {
    return sb.applyCookies(
      NextResponse.json(
        { error: "너무 많은 시도입니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      )
    );
  }

  // 4. 요청 본문 파싱
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
    );
  }

  const code = body.code?.trim().toUpperCase();
  if (!code || code.length < 2 || code.length > 30) {
    return sb.applyCookies(
      NextResponse.json({ error: "올바른 코드를 입력해주세요." }, { status: 400 })
    );
  }

  // 5. 코드 유효성 검증
  const { data: codeData, error: codeError } = await sb.client
    .from("teacher_codes")
    .select("code, kindergarten_name, daily_session_limit")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (codeError || !codeData) {
    return sb.applyCookies(
      NextResponse.json(
        { error: "유효하지 않은 코드입니다." },
        { status: 404 }
      )
    );
  }

  // 6. 일일 세션 한도 체크 (코드별)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb.client
    .from("teacher_sessions")
    .select("id", { count: "exact", head: true })
    .eq("code", code)
    .gte("created_at", oneDayAgo);

  if (count !== null && count >= codeData.daily_session_limit) {
    return sb.applyCookies(
      NextResponse.json(
        { error: "오늘 이 코드의 사용 한도에 도달했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      )
    );
  }

  // 7. 기존 활성 세션 확인 (같은 사용자)
  const { data: existingSession } = await sb.client
    .from("teacher_sessions")
    .select("id, expires_at, current_phase, turn_count")
    .eq("teacher_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSession) {
    // 기존 세션 반환 (중복 생성 방지)
    return sb.applyCookies(
      NextResponse.json({
        sessionId: existingSession.id,
        kindergartenName: codeData.kindergarten_name,
        expiresAt: existingSession.expires_at,
        currentPhase: existingSession.current_phase,
        turnCount: existingSession.turn_count,
        isExisting: true,
      })
    );
  }

  // 8. 새 세션 생성
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: session, error: sessionError } = await sb.client
    .from("teacher_sessions")
    .insert({
      teacher_id: user.id,
      code,
      expires_at: expiresAt,
      current_phase: "A",
      turn_count: 0,
      onboarding: {},
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[Teacher] Session creation failed:", sessionError?.message);
    return sb.applyCookies(
      NextResponse.json(
        { error: "세션 생성에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      )
    );
  }

  // 9. 이벤트 로깅 (fire-and-forget)
  logEvent({
    eventType: "teacher_session_created",
    endpoint: "/api/teacher/verify-code",
    method: "POST",
    statusCode: 200,
    userId: user.id,
    metadata: {
      code,
      kindergartenName: codeData.kindergarten_name,
    },
  }).catch(() => {});

  return sb.applyCookies(
    NextResponse.json({
      sessionId: session.id,
      kindergartenName: codeData.kindergarten_name,
      expiresAt,
      currentPhase: "A",
      turnCount: 0,
      isExisting: false,
    })
  );
}
