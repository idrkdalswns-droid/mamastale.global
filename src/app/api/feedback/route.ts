import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback format" },
        { status: 400 }
      );
    }

    // TODO: Save to Supabase when DB is connected
    // For now, log feedback for collection
    console.log("[Feedback received]", JSON.stringify(parsed.data, null, 2));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
