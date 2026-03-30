/**
 * GET /api/tq/generate — 딸깍 동화 SSE 표시 전용
 * DB 폴링으로 생성된 장면을 실시간 스트리밍
 * 인앱 브라우저 감지 시 JSON 폴링 모드 자동 전환
 */

import { NextRequest } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";
import { t } from "@/lib/i18n";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:generate", { maxEntries: 100 });

// 인앱 브라우저 패턴
const IN_APP_PATTERNS = [
  /KAKAOTALK/i,
  /NAVER/i,
  /Line/i,
  /Instagram/i,
  /FBAN|FBAV/i,
  /Twitter/i,
];

function isInAppBrowser(ua: string): boolean {
  return IN_APP_PATTERNS.some((p) => p.test(ua));
}

export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return new Response(
      JSON.stringify({ error: t("Errors.system.configError") }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  const user = await resolveUser(sb.client, request, "TQ-Generate");
  if (!user)
    return new Response(
      JSON.stringify({ error: t("Errors.auth.loginRequired") }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );

  if (!limiter.check(user.id, 3, 60_000))
    return new Response(
      JSON.stringify({ error: t("Errors.rateLimit.tooManyRequestsShort") }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
    );

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId)
    return new Response(
      JSON.stringify({ error: t("Errors.validation.sessionIdFieldRequired") }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

  // UUID 형식 검증
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))
    return new Response(
      JSON.stringify({ error: t("Errors.validation.invalidSessionId") }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

  // 세션 확인
  const { data: session } = await sb.client
    .from("tq_sessions")
    .select("id, user_id, status, generated_story, primary_emotion")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session)
    return new Response(
      JSON.stringify({ error: t("Errors.teacher.sessionNotFound") }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );

  // 인앱 브라우저 → JSON 폴링 모드
  const ua = request.headers.get("user-agent") ?? "";
  const polling = isInAppBrowser(ua) || request.nextUrl.searchParams.get("polling") === "true";

  if (polling) {
    const scenes = Array.isArray(session.generated_story) ? session.generated_story : [];
    return new Response(
      JSON.stringify({
        scenes,
        status: session.status,
        primary_emotion: session.primary_emotion,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // SSE 스트리밍
  const cookieHeaders = sb.getCookieHeaders();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 메타 이벤트
      send({ type: "meta", sessionId, source: "tq" });

      let lastSceneCount = 0;
      const maxPolls = 300; // 최대 5분 (1초 간격)

      for (let i = 0; i < maxPolls; i++) {
        // DB 폴링
        const { data: current } = await sb.client
          .from("tq_sessions")
          .select("status, generated_story, primary_emotion")
          .eq("id", sessionId)
          .single();

        if (!current) {
          send({ type: "error", message: t("Errors.teacher.sessionNotFound") });
          break;
        }

        const scenes = Array.isArray(current.generated_story)
          ? current.generated_story
          : [];

        // 새 장면 감지 → SSE 이벤트 전송
        if (scenes.length > lastSceneCount) {
          for (let s = lastSceneCount; s < scenes.length; s++) {
            const scene = scenes[s] as { sceneNumber: number; title: string; text: string };
            send({
              type: "scene",
              number: scene.sceneNumber,
              title: scene.title,
            });
            send({ type: "text", text: scene.text });
            send({
              type: "progress",
              scene: scene.sceneNumber,
              total: 9,
            });
          }
          lastSceneCount = scenes.length;
        }

        // 완료/실패 감지
        if (current.status === "completed") {
          send({
            type: "done",
            scenes: scenes.length,
            primaryEmotion: current.primary_emotion,
          });
          break;
        }

        if (current.status === "failed") {
          send({ type: "error", message: t("Errors.story.createFailed") });
          break;
        }

        // 1초 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      controller.close();
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
  };

  // 인증 쿠키 적용
  for (const cookie of cookieHeaders) {
    headers["Set-Cookie"] = cookie;
  }

  return new Response(stream, { headers });
}
