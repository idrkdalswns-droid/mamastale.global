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
  briefContextSchema,
  type TeacherBriefContext,
} from "@/lib/anthropic/teacher-prompts";
import { sanitizeUserInput } from "@/lib/utils/teacher-sanitize";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { logLLMCall, logEvent } from "@/lib/utils/llm-logger";
import { parseTeacherStory, extractStoryTitle } from "@/lib/utils/teacher-story-parser";
import { generateCoverImage } from "@/lib/illustration/generate";
import { uploadCoverToStorage } from "@/lib/illustration/upload";
import type { Scene } from "@/lib/types/story";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { z } from "zod";
import { t } from "@/lib/i18n";

const limiter = createInMemoryLimiter(RATE_KEYS.TEACHER_GENERATE_STORY);

// H2-FIX: Strict Zod schema for briefContext (prompt injection defense)
const requestSchema = z.object({
  sessionId: z.string().uuid(),
  briefContext: briefContextSchema,
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
  if (!sb) return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });

  const user = await resolveUser(sb.client, request);
  if (!user) return NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 });

  // R1: Rate limit — 5 requests per minute per user
  if (!limiter.check(user.id, 5, 60_000)) {
    return NextResponse.json(
      { error: t("Errors.rateLimit.tooManyRequests") },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 });
  }

  const { sessionId, briefContext, onboarding } = body;

  // H2-FIX: Sanitize string fields against prompt injection
  // Uses sanitizeUserInput (teacher-sanitize.ts) which strips control tags,
  // HTML entities, XML tags, and newlines
  const san = (v: string | null | undefined) => v ? sanitizeUserInput(v, 500) : v ?? null;
  briefContext.topic = san(briefContext.topic);
  briefContext.coreMessage = san(briefContext.coreMessage);
  briefContext.narrativeStructure = san(briefContext.narrativeStructure);
  briefContext.setting = san(briefContext.setting);
  briefContext.mood = san(briefContext.mood);
  briefContext.context = san(briefContext.context);
  briefContext.situation = san(briefContext.situation);
  briefContext.endingType = san(briefContext.endingType);
  briefContext.activityConnection = san(briefContext.activityConnection);
  if (briefContext.characterDNA) {
    briefContext.characterDNA.name = san(briefContext.characterDNA.name);
    briefContext.characterDNA.type = san(briefContext.characterDNA.type);
    briefContext.characterDNA.speechPattern = san(briefContext.characterDNA.speechPattern);
  }

  // Session validation (lightweight)
  const { data: session, error: sessionError } = await sb.client
    .from("teacher_sessions")
    .select("id, teacher_id, expires_at, stories_created, onboarding")
    .eq("id", sessionId)
    .eq("teacher_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: t("Errors.teacher.sessionNotFound") }, { status: 404 });
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: t("Errors.teacher.sessionExpired") }, { status: 401 });
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
  const timeout = setTimeout(() => controller.abort(), 28_000); // H3-FIX: 28s (Opus needs 20-25s, was timing out at 25s)

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
        { error: t("Errors.story.parseFailed") },
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
          ? t("Errors.story.generateTimeout")
          : t("Errors.story.generateFailed") },
      { status: isAbort ? 504 : 500 }
    );
  }
}
