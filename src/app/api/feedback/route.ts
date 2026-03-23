import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
// CA-7: Import shared isValidUUID instead of inline regex
import { getClientIP, isValidUUID, sanitizeText } from "@/lib/utils/validation";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

const feedbackLimiter = createInMemoryLimiter(RATE_KEYS.FEEDBACK);

// R8-1: Require at least one rating or free-text to prevent empty feedback spam
const feedbackSchema = z.object({
  empathy: z.number().min(1).max(5).optional(),
  insight: z.number().min(1).max(5).optional(),
  metaphor: z.number().min(1).max(5).optional(),
  story: z.number().min(1).max(5).optional(),
  overall: z.number().min(1).max(5).optional(),
  free: z.string().max(2000).optional(),
  sessionId: z.string().optional(),
}).refine(
  (d) => d.empathy || d.insight || d.metaphor || d.story || d.overall || d.free?.trim(),
  { message: "최소 하나의 평가 또는 의견이 필요합니다." }
);

export async function POST(request: NextRequest) {
  // Rate limiting (5 per 5min per IP)
  const ip = getClientIP(request);
  if (!feedbackLimiter.check(ip, 5, 300_000)) {
    return NextResponse.json(
      { error: "피드백은 5분에 5건까지 등록 가능합니다." },
      { status: 429 }
    );
  }

  try {
    // LAUNCH-FIX: Body size limit (feedback payloads are small, 16KB max)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 16_000) {
      return NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
    }

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

    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 피드백 형식입니다." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Log feedback summary (no PII)
    console.info("[Feedback received]", {
      hasEmpathy: !!data.empathy,
      hasInsight: !!data.insight,
      hasOverall: !!data.overall,
      hasFreeText: !!data.free,
    });

    // Try to save to Supabase if configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const supabase = createServerClient(url, key, {
          cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll() {},
          },
        });

        // Get user if logged in (optional)
        const { data: { user } } = await supabase.auth.getUser();

        // CA-7: Use shared UUID validator instead of inline regex
        const validSessionId = data.sessionId && isValidUUID(data.sessionId);

        await supabase.from("feedback").insert({
          user_id: user?.id || null,
          session_id: validSessionId ? data.sessionId : null,
          empathy_rating: data.empathy || null,
          insight_rating: data.insight || null,
          metaphor_rating: data.metaphor || null,
          story_rating: data.story || null,
          overall_rating: data.overall || null,
          free_text: data.free ? sanitizeText(data.free.trim()) : null,
        });
      } catch (dbErr) {
        // DB save failed — log but don't fail the request
        console.warn("[Feedback DB save failed]", dbErr instanceof Error ? dbErr.name : "Unknown");
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "일시적인 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
