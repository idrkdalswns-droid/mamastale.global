import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

// ─── Rate limiting (per-IP, per-isolate) ───
const FEEDBACK_RATE_WINDOW = 300_000; // 5 minutes
const FEEDBACK_RATE_LIMIT = 5; // max 5 feedback submissions per 5 min
const feedbackRateMap = new Map<string, { count: number; resetAt: number }>();

function checkFeedbackRateLimit(ip: string): boolean {
  const now = Date.now();
  if (feedbackRateMap.size > 300) {
    for (const [k, v] of feedbackRateMap) {
      if (now > v.resetAt) feedbackRateMap.delete(k);
    }
  }
  const entry = feedbackRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    feedbackRateMap.set(ip, { count: 1, resetAt: now + FEEDBACK_RATE_WINDOW });
    return true;
  }
  if (entry.count >= FEEDBACK_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const feedbackSchema = z.object({
  empathy: z.number().min(1).max(5).optional(),
  insight: z.number().min(1).max(5).optional(),
  metaphor: z.number().min(1).max(5).optional(),
  story: z.number().min(1).max(5).optional(),
  overall: z.number().min(1).max(5).optional(),
  free: z.string().max(2000).optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  if (!checkFeedbackRateLimit(ip)) {
    return NextResponse.json(
      { error: "피드백은 5분에 5건까지 등록 가능합니다." },
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

    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback format" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Log feedback summary (no PII)
    console.log("[Feedback received]", {
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

        // session_id in DB references sessions(id) as UUID.
        // Client sends "session_${timestamp}" which is NOT a valid UUID → skip FK.
        // Column names must match DB schema: empathy_rating, insight_rating, etc.
        const isValidUUID = data.sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.sessionId);

        await supabase.from("feedback").insert({
          user_id: user?.id || null,
          session_id: isValidUUID ? data.sessionId : null,
          empathy_rating: data.empathy || null,
          insight_rating: data.insight || null,
          metaphor_rating: data.metaphor || null,
          story_rating: data.story || null,
          overall_rating: data.overall || null,
          free_text: data.free || null,
        });
      } catch (dbErr) {
        // DB save failed — log but don't fail the request
        console.warn("[Feedback DB save failed]", dbErr instanceof Error ? dbErr.message : "Unknown");
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
