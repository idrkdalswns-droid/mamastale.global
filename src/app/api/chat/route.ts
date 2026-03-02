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
import { createServerClient } from "@supabase/ssr";
import { getClientIP } from "@/lib/utils/validation";

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(50000),  // Korean text can be much longer per token
    })
  ).max(120),  // Generous limit for long conversations
  sessionId: z.string().optional(),
  childAge: z.string().optional(),  // Lenient — validated downstream if needed
  currentPhase: z.number().min(1).max(4).optional(),
  turnCountInCurrentPhase: z.number().min(0).optional(),
});

// ─── Rate Limiting (per-isolate, in-memory) ───
const RATE_WINDOW_MS = 60_000; // 1 minute
const GUEST_RATE_LIMIT = 10;   // 10 req/min for unauthenticated
const AUTH_RATE_LIMIT = 30;    // 30 req/min for authenticated
const GUEST_TURN_LIMIT = 3;   // Server-side guest message limit

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  // Lazy cleanup to prevent memory leak
  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

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
  const ip = getClientIP(request);

  // ─── Auth check (optional — guests allowed with limits) ───
  let userId: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      });
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Auth check failed — treat as guest
    }
  }

  const isAuthenticated = !!userId;
  const rateKey = isAuthenticated ? `auth:${userId}` : `ip:${ip}`;
  const rateLimit = isAuthenticated ? AUTH_RATE_LIMIT : GUEST_RATE_LIMIT;

  // ─── Rate limiting ───
  if (!checkRateLimit(rateKey, rateLimit)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  try {
    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[Chat] Zod validation failed:", JSON.stringify(parsed.error.issues.map(i => ({ path: i.path, code: i.code, message: i.message }))));
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    const { messages, childAge, currentPhase: clientPhase, turnCountInCurrentPhase } = parsed.data;

    // ─── Server-side guest turn limit ───
    // Count by total conversation turns (messages / 2), not just user messages,
    // to prevent bypass via fabricated assistant messages in the array.
    if (!isAuthenticated) {
      const userMsgCount = messages.filter((m) => m.role === "user").length;
      const totalTurns = Math.ceil(messages.length / 2);
      if (userMsgCount > GUEST_TURN_LIMIT || totalTurns > GUEST_TURN_LIMIT + 1) {
        return NextResponse.json(
          { error: "무료 체험 횟수를 초과했습니다. 회원가입 후 이용해 주세요." },
          { status: 403 }
        );
      }
    }

    const anthropic = getAnthropicClient();
    let systemPrompt = getSystemPrompt("ko");

    // Append child age context to system prompt if provided
    if (childAge) {
      const ageLabels: Record<string, string> = {
        "0-2": "0~2세 (영아)",
        "3-5": "3~5세 (유아)",
        "6-8": "6~8세 (초등 저학년)",
      };
      systemPrompt += `\n\n<child_age_context>\n사용자의 자녀 연령: ${ageLabels[childAge] || childAge}\nPhase 4 동화 작성 시 해당 연령대의 스타일 가이드를 적용하십시오.\n</child_age_context>`;
    }

    // ─── Phase context injection (10-turn limit + forward-only) ───
    const MAX_TURNS_PER_PHASE = 10;
    const safePhase = clientPhase && clientPhase >= 1 && clientPhase <= 4 ? clientPhase : 1;
    const safeTurnCount = turnCountInCurrentPhase ?? 0;

    if (safeTurnCount >= MAX_TURNS_PER_PHASE && safePhase < 4) {
      // Force transition — turn limit reached
      systemPrompt += `\n\n<phase_turn_limit_exceeded>\n[긴급] 현재 Phase ${safePhase}에서 ${safeTurnCount}턴이 경과했습니다. 10턴 제한을 초과했으므로 반드시 Phase ${safePhase + 1}로 전환하십시오.\n이번 응답에서 [PHASE:${safePhase + 1}]을 출력하고, Phase ${safePhase + 1}의 역할로 자연스럽게 전환하십시오.\n</phase_turn_limit_exceeded>`;
    } else {
      systemPrompt += `\n\n<phase_context>\n현재 Phase: ${safePhase} | 이 Phase에서의 대화 턴: ${safeTurnCount}/${MAX_TURNS_PER_PHASE}\n현재 Phase보다 낮은 Phase 번호를 절대 출력하지 마십시오. [PHASE:${safePhase}] 이상만 허용됩니다.\n</phase_context>`;
    }

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

    const detectedPhase = detectPhase(rawText);
    // Server-side forward-only enforcement: never go backward
    const phase = detectedPhase !== null && detectedPhase < safePhase ? safePhase : detectedPhase;
    const cleanText = stripPhaseTag(rawText);
    const storyComplete = isStoryComplete(cleanText, phase);

    let storyId: string | undefined;
    let scenes: ReturnType<typeof parseStoryScenes> = [];

    if (storyComplete) {
      const allPhase4Text = messages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content)
        .join("\n\n") + "\n\n" + cleanText;

      scenes = parseStoryScenes(allPhase4Text);
      if (scenes.length > 0) {
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
    // Log error message only (no PII, no full stack)
    console.error("Chat API error:", error instanceof Error ? error.name : "Unknown");

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
