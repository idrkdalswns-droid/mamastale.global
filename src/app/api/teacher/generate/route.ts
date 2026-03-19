/**
 * Teacher Mode — Phase E: Haiku 추출 + Sonnet 생성
 *
 * 1. 전체 대화 히스토리 → Haiku로 브리프 추출 (~$0.001)
 * 2. 브리프 + 가드레일 → Sonnet 4로 14스프레드 + 부가자료 생성 (~$0.04)
 * 3. 파싱 후 teacher_stories에 저장
 *
 * @module teacher-generate
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { getAnthropicClient } from "@/lib/anthropic/client";
import {
  getExtractionPrompt,
  getTeacherGenerationPrompt,
  type TeacherBriefContext,
} from "@/lib/anthropic/teacher-prompts";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
import { parseTeacherStory, extractStoryTitle } from "@/lib/utils/teacher-story-parser";
import { sanitizeUserInput } from "@/lib/utils/teacher-sanitize";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

/** 기본 브리프 (추출 실패 시 폴백) */
function getDefaultBrief(onboarding: Record<string, unknown>): TeacherBriefContext {
  return {
    targetAge: (onboarding.ageGroup as string) || "toddler",
    topic: (onboarding.topic as string) || null,
    coreMessage: null,
    narrativeStructure: "문제-해결",
    characterDNA: {
      name: null,
      type: (onboarding.characterType as string) || null,
      personality: [],
      appearance: [],
      speechPattern: null,
      arc: null,
    },
    supportingCharacters: [],
    setting: null,
    mood: "warm",
    avoidElements: [],
    endingType: "happy",
    activityConnection: null,
    context: (onboarding.context as string) || null,
    situation: (onboarding.situation as string) || null,
  };
}

// parseSpreads, parseMetadata → teacher-story-parser.ts로 이전됨

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

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

  // 3. 레이트 리미팅
  const rateKey = `teacher:gen:${user.id}`;
  const withinLimit = await checkRateLimitPersistent(rateKey, 5, 60);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  // 4. 요청 파싱
  let body: z.infer<typeof requestSchema>;
  try {
    const raw = await request.json();
    body = requestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const { sessionId } = body;

  // 5. 세션 검증
  const { data: session, error: sessionError } = await sb.client
    .from("teacher_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "세션이 만료되었습니다." },
      { status: 401 }
    );
  }

  // 6. 전체 대화 히스토리 로드
  const { data: messageRows } = await sb.client
    .from("teacher_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const messages = (messageRows || []).map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "대화 히스토리가 없습니다." },
      { status: 400 }
    );
  }

  // 멱등성: 이미 이 세션에서 생성된 동화가 있으면 기존 결과 반환
  const { data: existingStory } = await sb.client
    .from("teacher_stories")
    .select("id, title, spreads, metadata, brief_context")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingStory) {
    return sb.applyCookies(
      NextResponse.json({
        id: existingStory.id,
        title: existingStory.title,
        spreads: existingStory.spreads,
        metadata: existingStory.metadata,
        briefContext: existingStory.brief_context,
        spreadCount: Array.isArray(existingStory.spreads)
          ? existingStory.spreads.length
          : 0,
      })
    );
  }

  const onboarding = session.onboarding || {};
  const anthropic = getAnthropicClient();

  // ─── Step 1: Haiku 브리프 추출 ───
  let briefContext: TeacherBriefContext;
  const extractionStart = Date.now();

  try {
    // Layer 3: 추출 프롬프트에 삽입 전 사용자 유래 필드 위생처리
    const safeOnboarding = {
      ...onboarding,
      topic: sanitizeUserInput(onboarding?.topic as string | undefined, 50),
      situation: sanitizeUserInput(onboarding?.situation as string | undefined, 200),
    };

    // F-003 FIX: AbortController timeout for Haiku extraction (30s)
    const extractController = new AbortController();
    const extractTimeout = setTimeout(() => extractController.abort(), 30_000);
    let extractionResult;
    try {
      extractionResult = await anthropic.messages.create({
        model: "claude-haiku-3-5-20241022",
        system: [
          {
            type: "text" as const,
            text: getExtractionPrompt(),
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [
          {
            role: "user" as const,
            content: `온보딩 정보:\n${JSON.stringify(safeOnboarding, null, 2)}\n\n대화 히스토리:\n${messages.map((m) => `[${m.role}]: ${m.content}`).join("\n\n")}`,
          },
        ],
        max_tokens: 2048,
      }, { signal: extractController.signal });
    } finally {
      clearTimeout(extractTimeout);
    }

    const extractionText =
      extractionResult.content[0].type === "text"
        ? extractionResult.content[0].text
        : "";

    // JSON 파싱 시도
    const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      briefContext = {
        targetAge: parsed.targetAge || onboarding.ageGroup || "toddler",
        topic: parsed.topic || onboarding.topic || null,
        coreMessage: parsed.coreMessage || null,
        narrativeStructure: parsed.narrativeStructure || "문제-해결",
        characterDNA: parsed.characterDNA || null,
        supportingCharacters: parsed.supportingCharacters || [],
        setting: parsed.setting || null,
        mood: parsed.mood || "warm",
        avoidElements: parsed.avoidElements || [],
        endingType: parsed.endingType || "happy",
        activityConnection: parsed.activityConnection || null,
        context: parsed.context || onboarding.context || null,
        situation: parsed.situation || onboarding.situation || null,
      };
    } else {
      console.warn("[Teacher Generate] Haiku extraction returned non-JSON, using defaults");
      briefContext = getDefaultBrief(onboarding);
    }

    // Haiku 로깅
    logLLMCall({
      sessionId,
      userId: user.id,
      model: "claude-haiku-3-5-20241022",
      phase: null,
      inputTokens: extractionResult.usage?.input_tokens ?? 0,
      outputTokens: extractionResult.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - extractionStart,
    }).catch(() => {});
  } catch (err) {
    console.error("[Teacher Generate] Haiku extraction failed:", err);
    briefContext = getDefaultBrief(onboarding);
  }

  // ─── Step 2: Sonnet 4 생성 ───
  const generationStart = Date.now();

  try {
    const generationPrompt = getTeacherGenerationPrompt(briefContext, onboarding);

    // F-003 FIX: AbortController timeout for Sonnet generation (120s)
    const genController = new AbortController();
    const genTimeout = setTimeout(() => genController.abort(), 120_000);
    let generationResult;
    try {
      generationResult = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        system: [
          {
            type: "text" as const,
            text: generationPrompt,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [
          {
            role: "user" as const,
            content: "14스프레드 동화를 생성해주세요.",
          },
        ],
        max_tokens: 8192,
      }, { signal: genController.signal });
    } finally {
      clearTimeout(genTimeout);
    }

    const generationText =
      generationResult.content[0].type === "text"
        ? generationResult.content[0].text
        : "";

    // 잘림 감지
    if (generationResult.stop_reason === "max_tokens") {
      console.warn("[Teacher Generate] Output truncated (max_tokens reached)");
      // 본문이 있으면 OK, 부가자료만 누락될 수 있음
    }

    // Sonnet 로깅
    logLLMCall({
      sessionId,
      userId: user.id,
      model: "claude-sonnet-4-20250514",
      phase: null,
      inputTokens: generationResult.usage?.input_tokens ?? 0,
      outputTokens: generationResult.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - generationStart,
    }).catch(() => {});

    // ─── Step 3: 파싱 ───
    const parseResult = parseTeacherStory(generationText);
    const { spreads, metadata } = parseResult;

    if (spreads.length === 0) {
      console.error("[Teacher/Generate] Parse failed. Raw preview:", generationText.slice(0, 300));
      return NextResponse.json(
        {
          error: "동화 생성 결과를 파싱할 수 없습니다. 다시 시도해주세요.",
          rawPreview: generationText.slice(0, 200).replace(/[<>]/g, ""),
        },
        { status: 500 }
      );
    }

    // 제목 추출
    const title = extractStoryTitle(spreads, briefContext.topic);

    // ─── Step 4: DB 저장 ───
    const { data: story, error: storyError } = await sb.client
      .from("teacher_stories")
      .insert({
        session_id: sessionId,
        teacher_id: user.id,
        title,
        spreads: spreads.map((s) => ({
          spreadNumber: s.spreadNumber,
          title: s.title,
          text: s.text,
        })),
        metadata,
        brief_context: briefContext,
      })
      .select("id")
      .single();

    if (storyError) {
      console.error("[Teacher Generate] Story save failed:", storyError);
      // 저장 실패해도 생성 결과는 반환
    }

    // 세션 업데이트
    sb.client
      .from("teacher_sessions")
      .update({
        current_phase: "DONE",
        stories_created: (session.stories_created || 0) + 1,
      })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (error) console.error("[Teacher Generate] Failed to update session:", error.message);
      });

    // 이벤트 로깅
    logEvent({
      eventType: "teacher_story_generated",
      userId: user.id,
      endpoint: "/api/teacher/generate",
      metadata: {
        sessionId,
        storyId: story?.id,
        spreadCount: spreads.length,
        targetAge: briefContext.targetAge,
        topic: briefContext.topic,
      },
    }).catch(() => {});

    // 5. 응답
    const response = NextResponse.json({
      id: story?.id || null,
      title,
      spreads,
      metadata,
      briefContext,
      spreadCount: spreads.length,
    });

    return sb.applyCookies(response);
  } catch (err) {
    console.error("[Teacher Generate] Sonnet generation failed:", err);

    // 즉시 1회 재시도 (Edge Runtime에서 blocking sleep 회피)
    try {
      // F-003 FIX: AbortController timeout for retry (120s)
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 120_000);
      let retryResult;
      try {
        retryResult = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          system: [
            {
              type: "text" as const,
              text: getTeacherGenerationPrompt(briefContext, onboarding),
              cache_control: { type: "ephemeral" as const },
            },
          ],
          messages: [
            {
              role: "user" as const,
              content: "14스프레드 동화를 생성해주세요.",
            },
          ],
          max_tokens: 8192,
        }, { signal: retryController.signal });
      } finally {
        clearTimeout(retryTimeout);
      }

      const retryText =
        retryResult.content[0].type === "text"
          ? retryResult.content[0].text
          : "";

      const retryParsed = parseTeacherStory(retryText);

      logLLMCall({
        sessionId,
        userId: user.id,
        model: "claude-sonnet-4-20250514",
        phase: null,
        inputTokens: retryResult.usage?.input_tokens ?? 0,
        outputTokens: retryResult.usage?.output_tokens ?? 0,
        latencyMs: Date.now() - generationStart,
        wasModelFallback: true,
        fallbackReason: "retry_after_failure",
      }).catch(() => {});

      if (retryParsed.spreads.length > 0) {
        const title = extractStoryTitle(retryParsed.spreads, briefContext.topic);

        // 중복 방지: 1차 시도가 부분 성공했을 수 있으므로 기존 story 확인
        const { data: existingRetry } = await sb.client
          .from("teacher_stories")
          .select("id")
          .eq("session_id", sessionId)
          .limit(1)
          .single();

        let storyId = existingRetry?.id || null;

        if (!existingRetry) {
          const { data: story } = await sb.client
            .from("teacher_stories")
            .insert({
              session_id: sessionId,
              teacher_id: user.id,
              title,
              spreads: retryParsed.spreads,
              metadata: retryParsed.metadata,
              brief_context: briefContext,
            })
            .select("id")
            .single();
          storyId = story?.id || null;

          sb.client
            .from("teacher_sessions")
            .update({
              current_phase: "DONE",
              stories_created: (session.stories_created || 0) + 1,
            })
            .eq("id", sessionId)
            .then(({ error }) => {
              if (error) console.error("[Teacher Generate] Retry session update failed:", error.message);
            });
        }

        return sb.applyCookies(
          NextResponse.json({
            id: storyId,
            title,
            spreads: retryParsed.spreads,
            metadata: retryParsed.metadata,
            briefContext,
            spreadCount: retryParsed.spreads.length,
          })
        );
      }
    } catch (retryErr) {
      console.error("[Teacher Generate] Retry also failed:", retryErr);
    }

    // F-003 FIX: Distinguish timeout errors
    const isAbort = err instanceof Error && (err.name === "AbortError" || err.message?.includes("aborted"));
    return NextResponse.json(
      { error: isAbort
          ? "동화 생성에 시간이 너무 오래 걸려요. 다시 시도해 주세요."
          : "동화 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: isAbort ? 504 : 500 }
    );
  }
}
