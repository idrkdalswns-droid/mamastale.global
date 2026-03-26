/**
 * TB1: Teacher Generate — Step 2: Sonnet Story Generation
 *
 * POST /api/teacher/generate/story
 * Generates 14-spread story from brief using Sonnet/Opus (~20s).
 * Separated from brief extraction to stay under Edge 30s limit.
 *
 * Expects: briefContext + sessionId from Step 1.
 *
 * @module teacher-generate-story
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

import { getAnthropicClient } from "@/lib/anthropic/client";
import {
  getTeacherGenerationPrompt,
  type TeacherBriefContext,
} from "@/lib/anthropic/teacher-prompts";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
import { parseTeacherStory, extractStoryTitle } from "@/lib/utils/teacher-story-parser";
import { generateCoverImage } from "@/lib/illustration/generate";
import { uploadCoverToStorage } from "@/lib/illustration/upload";
import type { Scene } from "@/lib/types/story";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  briefContext: z.record(z.unknown()),
  onboarding: z.record(z.unknown()).optional().default({}),
});

/** teacher spreads → Scene[] + imagePrompt extraction */
function buildCoverScenes(
  spreads: Array<{ spreadNumber: number; title: string; text: string }>,
  illustPrompts?: string,
): Scene[] {
  let firstPrompt: string | undefined;
  if (illustPrompts) {
    const match = illustPrompts.match(/\[SP\d+\]\s*([\s\S]*?)(?=\[SP\d+\]|$)/);
    firstPrompt = match?.[1]?.trim();
  }
  if (!firstPrompt && spreads.length > 0) {
    firstPrompt = spreads[0].text.slice(0, 200);
  }
  return spreads.map((s, i) => ({
    sceneNumber: s.spreadNumber,
    title: s.title,
    text: s.text,
    ...(i === 0 && firstPrompt ? { imagePrompt: firstPrompt } : {}),
  }));
}

/** Gemini cover generation + Storage upload (fire-and-forget) */
async function generateAndUploadCover(
  storyId: string,
  scenes: Scene[],
  title: string,
  sbClient: ReturnType<typeof createApiSupabaseClient>,
): Promise<void> {
  try {
    const result = await generateCoverImage(scenes, title);
    if (!result) return;
    const publicUrl = await uploadCoverToStorage(result.base64, result.mimeType, storyId);
    if (!publicUrl) return;
    await sbClient!.client.from("teacher_stories").update({ cover_image: publicUrl }).eq("id", storyId);
  } catch (e) {
    console.error("[Teacher/Cover] Cover generation failed (non-blocking):", e);
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });

  const user = await resolveUser(sb.client, request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { sessionId, briefContext: rawBrief, onboarding } = body;
  const briefContext = rawBrief as unknown as TeacherBriefContext;

  // Session validation (lightweight)
  const { data: session, error: sessionError } = await sb.client
    .from("teacher_sessions")
    .select("id, teacher_id, expires_at, stories_created, onboarding")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "세션이 만료되었습니다." }, { status: 401 });
  }

  // T1+TB2 Fix: Extend session TTL on generation
  sb.client
    .from("teacher_sessions")
    .update({ expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })
    .eq("id", sessionId)
    .then(({ error }) => {
      if (error) console.error("[Teacher/Story] Session extend failed:", error.message);
    });

  // Idempotency check
  const { data: existingStory } = await sb.client
    .from("teacher_stories")
    .select("id, title, spreads, metadata, brief_context, cover_image")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingStory) {
    return sb.applyCookies(NextResponse.json({
      id: existingStory.id,
      title: existingStory.title,
      spreads: existingStory.spreads,
      metadata: existingStory.metadata,
      briefContext: existingStory.brief_context,
      spreadCount: Array.isArray(existingStory.spreads) ? existingStory.spreads.length : 0,
      coverImage: existingStory.cover_image || null,
    }));
  }

  // ─── Sonnet/Opus Generation ───
  const anthropic = getAnthropicClient();
  const generationPrompt = getTeacherGenerationPrompt(briefContext, onboarding);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000); // 25s (under 30s Edge limit)

  try {
    let generationResult;
    try {
      generationResult = await anthropic.messages.create({
        model: "claude-opus-4-20250514",
        system: [{
          type: "text" as const,
          text: generationPrompt,
          cache_control: { type: "ephemeral" as const },
        }],
        messages: [{
          role: "user" as const,
          content: "14스프레드 동화를 생성해주세요.",
        }],
        max_tokens: 8192,
      }, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const generationText = generationResult.content[0].type === "text"
      ? generationResult.content[0].text
      : "";

    if (generationResult.stop_reason === "max_tokens") {
      console.warn("[Teacher/Story] Output truncated (max_tokens reached)");
    }

    logLLMCall({
      sessionId,
      userId: user.id,
      model: "claude-opus-4-20250514",
      phase: null,
      inputTokens: generationResult.usage?.input_tokens ?? 0,
      outputTokens: generationResult.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - requestStartTime,
    }).catch(() => {});

    // Parse
    const { spreads, metadata } = parseTeacherStory(generationText);

    if (spreads.length === 0) {
      console.error("[Teacher/Story] Parse failed. Raw preview:", generationText.slice(0, 300));
      return NextResponse.json(
        { error: "동화 생성 결과를 파싱할 수 없습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const title = extractStoryTitle(spreads, briefContext.topic);

    // Save to DB
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
      console.error("[Teacher/Story] Save failed:", storyError);
    }

    // Update session
    sb.client
      .from("teacher_sessions")
      .update({
        current_phase: "DONE",
        stories_created: (session.stories_created || 0) + 1,
      })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (error) console.error("[Teacher/Story] Session update failed:", error.message);
      });

    // Cover generation (fire-and-forget)
    if (story?.id) {
      const coverScenes = buildCoverScenes(spreads, metadata.illustPrompts);
      generateAndUploadCover(story.id, coverScenes, title || "", sb).catch(() => {});
    }

    logEvent({
      eventType: "teacher_story_generated",
      userId: user.id,
      endpoint: "/api/teacher/generate/story",
      metadata: {
        sessionId,
        storyId: story?.id,
        spreadCount: spreads.length,
        targetAge: briefContext.targetAge,
        topic: briefContext.topic,
      },
    }).catch(() => {});

    return sb.applyCookies(NextResponse.json({
      id: story?.id || null,
      title,
      spreads,
      metadata,
      briefContext,
      spreadCount: spreads.length,
      coverImage: null,
    }));
  } catch (err) {
    console.error("[Teacher/Story] Generation failed:", err);
    const isAbort = err instanceof Error && (err.name === "AbortError" || err.message?.includes("aborted"));
    return NextResponse.json(
      { error: isAbort
          ? "동화 생성에 시간이 너무 오래 걸려요. 다시 시도해 주세요."
          : "동화 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: isAbort ? 504 : 500 }
    );
  }
}
