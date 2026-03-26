/**
 * TB1: Teacher Generate — Step 1: Haiku Brief Extraction
 *
 * POST /api/teacher/generate/brief
 * Extracts story brief from conversation using Haiku (~5s).
 * Separated from story generation to stay under Edge 30s limit.
 *
 * Returns: briefContext JSON + sessionId for Step 2.
 *
 * @module teacher-generate-brief
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { getAnthropicClient } from "@/lib/anthropic/client";
import { getExtractionPrompt, type TeacherBriefContext } from "@/lib/anthropic/teacher-prompts";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { logLLMCall } from "@/lib/utils/llm-logger";
import { sanitizeUserInput } from "@/lib/utils/teacher-sanitize";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

/** Default brief when extraction fails */
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

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });

  const user = await resolveUser(sb.client, request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const rateKey = `teacher:gen:${user.id}`;
  const withinLimit = await checkRateLimitPersistent(rateKey, 5, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { sessionId } = body;

  // Session validation
  const { data: session, error: sessionError } = await sb.client
    .from("teacher_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "세션이 만료되었습니다." }, { status: 401 });
  }

  // T1+TB2 Fix: Extend session TTL on generation start
  sb.client
    .from("teacher_sessions")
    .update({ expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })
    .eq("id", sessionId)
    .then(({ error }) => {
      if (error) console.error("[Teacher/Brief] Session extend failed:", error.message);
    });

  // Idempotency: check existing story
  const { data: existingStory } = await sb.client
    .from("teacher_stories")
    .select("id, title, spreads, metadata, brief_context, cover_image")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingStory) {
    return sb.applyCookies(NextResponse.json({
      alreadyGenerated: true,
      id: existingStory.id,
      title: existingStory.title,
      spreads: existingStory.spreads,
      metadata: existingStory.metadata,
      briefContext: existingStory.brief_context,
      spreadCount: Array.isArray(existingStory.spreads) ? existingStory.spreads.length : 0,
      coverImage: existingStory.cover_image || null,
    }));
  }

  // Load conversation history
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
    return NextResponse.json({ error: "대화 히스토리가 없습니다." }, { status: 400 });
  }

  const onboarding = session.onboarding || {};
  const anthropic = getAnthropicClient();

  // ─── Haiku Brief Extraction ───
  let briefContext: TeacherBriefContext;

  try {
    const safeOnboarding = {
      ...onboarding,
      topic: sanitizeUserInput(onboarding?.topic as string | undefined, 50),
      situation: sanitizeUserInput(onboarding?.situation as string | undefined, 200),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000); // 25s (under 30s Edge limit)

    let result;
    try {
      result = await anthropic.messages.create({
        model: "claude-haiku-3-5-20241022",
        system: [{
          type: "text" as const,
          text: getExtractionPrompt(),
          cache_control: { type: "ephemeral" as const },
        }],
        messages: [{
          role: "user" as const,
          content: `온보딩 정보:\n${JSON.stringify(safeOnboarding, null, 2)}\n\n대화 히스토리:\n${messages.map((m) => `[${m.role}]: ${m.content}`).join("\n\n")}`,
        }],
        max_tokens: 2048,
      }, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const text = result.content[0].type === "text" ? result.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

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
      briefContext = getDefaultBrief(onboarding);
    }

    logLLMCall({
      sessionId,
      userId: user.id,
      model: "claude-haiku-3-5-20241022",
      phase: null,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - requestStartTime,
    }).catch(() => {});
  } catch (err) {
    console.error("[Teacher/Brief] Haiku extraction failed:", err);
    briefContext = getDefaultBrief(onboarding);
  }

  return sb.applyCookies(NextResponse.json({
    briefContext,
    sessionId,
    onboarding,
  }));
}
