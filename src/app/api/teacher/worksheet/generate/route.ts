/**
 * Teacher Worksheet Generate API
 *
 * POST /api/teacher/worksheet/generate
 * Generates a structured worksheet HTML from a story using Claude.
 *
 * Flow:
 * 1. Auth (resolveUser)
 * 2. Zod input validation
 * 3. Rate limiting
 * 4. Fetch story text from DB
 * 5. Ensure character metadata (lazy migration)
 * 6. Build modular prompt
 * 7. Call Claude (Haiku 4.5 with structured output)
 * 8. Validate output with Zod
 * 9. Render HTML template
 * 10. Consume ticket (success only, SKIPPED during dev)
 * 11. Save to worksheet_outputs
 * 12. Return HTML
 *
 * @module api/teacher/worksheet/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { selectWorksheetModel } from "@/lib/anthropic/model-router";
import { buildWorksheetPrompt } from "@/lib/worksheet/prompts/builder";
import { getWorksheetSchema } from "@/lib/worksheet/schemas";
import { AGE_PARAMS } from "@/lib/worksheet/age-params";
import { ensureCharacterMetadata } from "@/lib/worksheet/character-extractor";
import { renderEmotionWorksheet } from "@/lib/worksheet/templates/emotion-worksheet";
import { renderPostReadingWorksheet } from "@/lib/worksheet/templates/post-reading-worksheet";
import { renderColoringWorksheet } from "@/lib/worksheet/templates/coloring-worksheet";
import { renderVocabularyWorksheet } from "@/lib/worksheet/templates/vocabulary-worksheet";
import { renderCharacterCardWorksheet } from "@/lib/worksheet/templates/character-card-worksheet";
import { renderStoryMapWorksheet } from "@/lib/worksheet/templates/story-map-worksheet";
import { renderWhatIfWorksheet } from "@/lib/worksheet/templates/what-if-worksheet";
import { renderSpeechBubbleWorksheet } from "@/lib/worksheet/templates/speech-bubble-worksheet";
import { renderRoleplayScriptWorksheet } from "@/lib/worksheet/templates/roleplay-script-worksheet";
import type { ActivityType, AgeGroup, WorksheetParams, DerivedParams } from "@/lib/worksheet/types";
import type {
  EmotionWorksheetOutput,
  PostReadingWorksheetOutput,
  ColoringWorksheetOutput,
  VocabularyWorksheetOutput,
  CharacterCardWorksheetOutput,
  StoryMapWorksheetOutput,
  WhatIfWorksheetOutput,
  SpeechBubbleWorksheetOutput,
  RoleplayScriptWorksheetOutput,
} from "@/lib/worksheet/schemas";

export const runtime = "edge";

// ─── Rate Limiter ───
const worksheetLimiter = createInMemoryLimiter(RATE_KEYS.TEACHER_WORKSHEET, { maxEntries: 200 });

// ─── Renderer Map ───
const RENDERERS: Record<string, (data: unknown, params: DerivedParams) => string> = {
  emotion: (d, p) => renderEmotionWorksheet(d as EmotionWorksheetOutput, p),
  post_reading: (d, p) => renderPostReadingWorksheet(d as PostReadingWorksheetOutput, p),
  coloring: (d, p) => renderColoringWorksheet(d as ColoringWorksheetOutput, p),
  vocabulary: (d, p) => renderVocabularyWorksheet(d as VocabularyWorksheetOutput, p),
  character_card: (d, p) => renderCharacterCardWorksheet(d as CharacterCardWorksheetOutput, p),
  story_map: (d, p) => renderStoryMapWorksheet(d as StoryMapWorksheetOutput, p),
  what_if: (d, p) => renderWhatIfWorksheet(d as WhatIfWorksheetOutput, p),
  speech_bubble: (d, p) => renderSpeechBubbleWorksheet(d as SpeechBubbleWorksheetOutput, p),
  roleplay_script: (d, p) => renderRoleplayScriptWorksheet(d as RoleplayScriptWorksheetOutput, p),
};

// ─── Input Schema ───
const SUPPORTED_ACTIVITIES: ActivityType[] = [
  "emotion", "post_reading", "coloring", "vocabulary", "character_card",
  "story_map", "what_if", "speech_bubble", "roleplay_script",
];

const requestSchema = z.object({
  story_id: z.string().uuid(),
  activity_type: z.enum([
    "emotion", "post_reading", "coloring", "vocabulary", "character_card",
    "story_map", "what_if", "speech_bubble", "roleplay_script",
  ] as const),
  age_group: z.enum(["age_3", "age_4", "age_5", "mixed"] as const),
  character_focus: z.string().max(50).default("all"),
  content_focus: z.string().max(50),
  output_style: z.string().max(50).optional().default("default"),
  extra_detail: z.string().max(200).optional(),
  is_recommended: z.boolean().default(false),
});

// ─── POST Handler ───
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

  // 3. Rate limiting (20 per hour per user)
  if (!worksheetLimiter.check(`ws:${user.id}`, 20, 3600_000)) {
    return sb.applyCookies(
      NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": "3600" } }
      )
    );
  }

  // 4. Parse & validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return sb.applyCookies(
      NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
    );
  }

  const params: WorksheetParams = {
    story_id: parsed.data.story_id,
    activity_type: parsed.data.activity_type,
    age_group: parsed.data.age_group,
    character_focus: parsed.data.character_focus,
    content_focus: parsed.data.content_focus,
    output_style: parsed.data.output_style,
    extra_detail: parsed.data.extra_detail,
    is_recommended: parsed.data.is_recommended,
  };

  // 5. Fetch story
  const { data: story, error: storyErr } = await sb.client
    .from("teacher_stories")
    .select("id, spreads, metadata, title")
    .eq("id", params.story_id)
    .single();

  if (storyErr || !story) {
    return sb.applyCookies(
      NextResponse.json({ error: "동화를 찾을 수 없습니다." }, { status: 404 })
    );
  }

  // Reconstruct story text from spreads
  const spreads = story.spreads as Array<{ spreadNumber: number; title: string; text: string }>;
  const storyText = spreads
    .sort((a, b) => a.spreadNumber - b.spreadNumber)
    .map((s) => `[장면 ${s.spreadNumber}] ${s.title}\n${s.text}`)
    .join("\n\n");

  if (!storyText.trim()) {
    return sb.applyCookies(
      NextResponse.json({ error: "동화 내용을 찾을 수 없습니다." }, { status: 400 })
    );
  }

  // 5.5. Ticket check & atomic deduction BEFORE Claude call (3.1 FIX: race condition)
  const { count: wsCount } = await sb.client
    .from("worksheet_outputs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isFirstFree = (wsCount ?? 0) === 0;

  // Use service_role client for ticket deduction (bypasses RLS)
  const adminClient = createServiceRoleClient();
  if (!adminClient) {
    return sb.applyCookies(
      NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 503 })
    );
  }

  let ticketDeducted = false;
  if (!isFirstFree) {
    const { data: ticketOk } = await adminClient.rpc('consume_worksheet_ticket', {
      p_user_id: user.id,
      p_count: 1,
    });
    if (!ticketOk) {
      return sb.applyCookies(
        NextResponse.json(
          { error: "활동지 티켓이 부족합니다. 티켓을 구매해 주세요.", code: "INSUFFICIENT_TICKETS" },
          { status: 403 }
        )
      );
    }
    ticketDeducted = true;
  }

  // 6. Ensure character metadata (lazy migration)
  const characters = await ensureCharacterMetadata(
    params.story_id,
    storyText,
    sb.client,
    "teacher_stories"
  );

  // 7. Build prompt
  const prompt = buildWorksheetPrompt(params, storyText, characters);

  // 8. Call Claude
  const modelSelection = selectWorksheetModel(params.activity_type);
  const outputSchema = getWorksheetSchema(params.activity_type);

  let claudeResponse: string;
  let tokensUsed = 0;

  // Retry logic (max 2 attempts)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model: modelSelection.model,
        max_tokens: modelSelection.maxTokens,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      });

      claudeResponse = response.content[0].type === "text" ? response.content[0].text : "";
      tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
      break;
    } catch (error) {
      if (attempt === 1) {
        console.error("[worksheet] Claude call failed after 2 attempts:", error);
        // 3.1 FIX: Refund ticket on Claude failure
        if (ticketDeducted) {
          try { await adminClient.rpc('refund_worksheet_ticket', { p_user_id: user.id, p_count: 1 }); } catch { /* refund best-effort */ }
        }
        return sb.applyCookies(
          NextResponse.json(
            { error: "활동지 생성에 실패했어요. 다시 시도해 주세요." },
            { status: 502 }
          )
        );
      }
      // Wait before retry
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  // 9. Parse & validate Claude output
  let worksheetData: unknown;
  try {
    // Strip markdown code fences if present
    let cleaned = claudeResponse!;
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1];
    }
    // Extract outermost JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);

    // Unwrap common wrapper patterns (e.g. { activity_sheet: { ... } })
    // If the parsed object has exactly 1 key and that key's value is an object, unwrap it
    const keys = Object.keys(parsed);
    if (keys.length === 1 && typeof parsed[keys[0]] === "object" && !Array.isArray(parsed[keys[0]])) {
      const inner = parsed[keys[0]];
      // Check if inner has expected fields (title, nuri_domain) or needs further unwrap
      if (inner.title || inner.emotion_scenes || inner.comprehension_questions) {
        worksheetData = inner;
      } else {
        // Try one more level (e.g. { activity_sheet: { metadata: { title }, content: { ... } } })
        worksheetData = parsed;
      }
    } else {
      worksheetData = parsed;
    }
  } catch {
    console.error("[worksheet] Failed to parse Claude JSON:", claudeResponse!.slice(0, 200));
    // 3.1 FIX: Refund ticket on parse failure
    if (ticketDeducted) {
      try { await adminClient.rpc('refund_worksheet_ticket', { p_user_id: user.id, p_count: 1 }); } catch { /* refund best-effort */ }
    }
    return sb.applyCookies(
      NextResponse.json(
        { error: "활동지 생성에 실패했어요. 다시 시도해 주세요." },
        { status: 502 }
      )
    );
  }

  // Defensive: truncate oversized arrays before validation
  const wd = worksheetData as Record<string, unknown>;
  if (Array.isArray(wd.emotion_scenes) && wd.emotion_scenes.length > 5) {
    wd.emotion_scenes = wd.emotion_scenes.slice(0, 5);
  }
  if (Array.isArray(wd.emotion_icons) && wd.emotion_icons.length > 6) {
    wd.emotion_icons = wd.emotion_icons.slice(0, 6);
  }
  if (Array.isArray(wd.comprehension_questions) && wd.comprehension_questions.length > 4) {
    wd.comprehension_questions = wd.comprehension_questions.slice(0, 4);
  }
  // Coloring
  if (Array.isArray(wd.coloring_scenes) && wd.coloring_scenes.length > 2) {
    wd.coloring_scenes = wd.coloring_scenes.slice(0, 2);
  }
  // Vocabulary
  if (Array.isArray(wd.words) && wd.words.length > 5) {
    wd.words = wd.words.slice(0, 5);
  }
  // Character Card
  if (Array.isArray(wd.characters) && wd.characters.length > 3) {
    wd.characters = wd.characters.slice(0, 3);
  }
  // Story Map
  if (Array.isArray(wd.phases) && wd.phases.length > 5) {
    wd.phases = wd.phases.slice(0, 5);
  }
  // What-If
  if (Array.isArray(wd.perspective_questions) && wd.perspective_questions.length > 4) {
    wd.perspective_questions = wd.perspective_questions.slice(0, 4);
  }
  // Speech Bubble
  if (Array.isArray(wd.dialogue_pairs) && wd.dialogue_pairs.length > 6) {
    wd.dialogue_pairs = wd.dialogue_pairs.slice(0, 6);
  }
  // Roleplay Script
  if (Array.isArray(wd.characters_list) && wd.characters_list.length > 4) {
    wd.characters_list = wd.characters_list.slice(0, 4);
  }
  if (Array.isArray(wd.scenes) && wd.scenes.length > 3) {
    wd.scenes = wd.scenes.slice(0, 3);
  }
  if (Array.isArray(wd.props_list) && wd.props_list.length > 5) {
    wd.props_list = wd.props_list.slice(0, 5);
  }
  // Truncate oversized strings
  for (const key of ["title", "subtitle", "instructions", "body_mapping_prompt", "drawing_prompt", "writing_prompt", "creative_extension", "color_suggestion", "free_drawing_prompt", "comparison_question", "free_dialogue_prompt", "my_story_prompt", "discussion_after", "writing_practice_word"] as const) {
    if (typeof wd[key] === "string" && (wd[key] as string).length > 400) {
      (wd as Record<string, unknown>)[key] = (wd[key] as string).slice(0, 400);
    }
  }

  const validated = outputSchema.safeParse(worksheetData);
  if (!validated.success) {
    console.error("[worksheet] Zod validation failed:", validated.error.issues.slice(0, 3));
    // 3.1 FIX: Refund ticket on validation failure
    if (ticketDeducted) {
      try { await adminClient.rpc('refund_worksheet_ticket', { p_user_id: user.id, p_count: 1 }); } catch { /* refund best-effort */ }
    }
    return sb.applyCookies(
      NextResponse.json(
        { error: "활동지 생성에 실패했어요. 다시 시도해 주세요." },
        { status: 502 }
      )
    );
  }

  // 10. Render HTML
  const derivedParams = AGE_PARAMS[params.age_group];
  let html: string;

  const renderer = RENDERERS[params.activity_type];
  if (!renderer) {
    return sb.applyCookies(
      NextResponse.json({ error: "지원하지 않는 활동지 유형입니다." }, { status: 400 })
    );
  }
  html = renderer(validated.data, derivedParams);

  // 11. (Moved to step 5.5 — ticket already deducted before Claude call)
  const generationTimeMs = Date.now() - startTime;

  // 12. Save to worksheet_outputs
  const { error: saveErr } = await adminClient.from("worksheet_outputs").insert({
    user_id: user.id,
    story_id: params.story_id,
    activity_type: params.activity_type,
    params: {
      age_group: params.age_group,
      character_focus: params.character_focus,
      content_focus: params.content_focus,
      output_style: params.output_style,
      extra_detail: params.extra_detail,
      is_recommended: params.is_recommended,
    },
    html_content: html,
    structured_data: validated.data,
    nuri_domains: [validated.data.nuri_domain],
    model_used: modelSelection.model,
    tokens_used: tokensUsed,
    generation_time_ms: generationTimeMs,
  });
  if (saveErr) {
    // 환불 (첫 무료가 아닌 경우에만)
    if (!isFirstFree) {
      await adminClient.rpc('refund_worksheet_ticket', { p_user_id: user.id, p_count: 1 });
    }
    console.error("[worksheet] Failed to save, refunded ticket:", saveErr.message, saveErr.code);
  }

  // 13. Return HTML
  return sb.applyCookies(
    NextResponse.json({
      html,
      structured_data: validated.data,
      activity_type: params.activity_type,
      nuri_domain: validated.data.nuri_domain,
      generation_time_ms: generationTimeMs,
    })
  );
}
