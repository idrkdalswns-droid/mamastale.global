import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { getSystemPrompt } from "@/lib/anthropic/system-prompt";
import {
  detectPhase,
  stripPhaseTag,
  isStoryComplete,
} from "@/lib/anthropic/phase-detection";
import { parseStoryScenes } from "@/lib/utils/story-parser";
import { z } from "zod";

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(5000),
    })
  ),
  sessionId: z.string().optional(),
});

/** Simple retry with exponential backoff for transient errors */
async function callAnthropicWithRetry(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 2
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Error &&
        ("status" in err &&
          (
            (err as { status: number }).status === 429 ||
            (err as { status: number }).status === 529 ||
            (err as { status: number }).status >= 500
          ));

      if (!isRetryable || attempt === maxRetries) throw err;

      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 8000);
      console.warn(`Anthropic API retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { messages } = parsed.data;

    const anthropic = getAnthropicClient();
    const systemPrompt = getSystemPrompt("ko");

    const response = await callAnthropicWithRetry(anthropic, {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const phase = detectPhase(rawText);
    const cleanText = stripPhaseTag(rawText);
    const storyComplete = isStoryComplete(cleanText, phase);

    let storyId: string | undefined;
    let scenes: ReturnType<typeof parseStoryScenes> = [];

    if (storyComplete) {
      // Parse story scenes from all Phase 4 responses
      const allPhase4Text = messages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content)
        .join("\n\n") + "\n\n" + cleanText;

      scenes = parseStoryScenes(allPhase4Text);
      if (scenes.length > 0) {
        // Generate a temporary story ID (will be replaced by Supabase ID when DB is connected)
        storyId = `story_${Date.now()}`;
      }
    }

    return NextResponse.json({
      content: cleanText,
      phase,
      isStoryComplete: storyComplete,
      storyId,
      ...(storyComplete && scenes.length > 0 ? { scenes } : {}),
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);

    // Provide user-friendly error messages
    if (error instanceof Error && "status" in error) {
      const status = (error as { status: number }).status;
      if (status === 429) {
        return NextResponse.json(
          { error: "잠시 후 다시 시도해 주세요. (요청이 너무 많습니다)" },
          { status: 429 }
        );
      }
      if (status === 401) {
        return NextResponse.json(
          { error: "API 인증 오류가 발생했습니다." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
