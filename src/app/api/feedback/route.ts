import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

export const runtime = "edge";

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

        await supabase.from("feedback").insert({
          user_id: user?.id || null,
          session_id: data.sessionId || null,
          empathy: data.empathy || null,
          insight: data.insight || null,
          metaphor: data.metaphor || null,
          story: data.story || null,
          overall: data.overall || null,
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
