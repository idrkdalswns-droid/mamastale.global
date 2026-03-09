import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { getClientIP, isValidUUID } from "@/lib/utils/validation";

export const runtime = "edge";

// ─── Rate limiting (5 per 5min per IP) ───
const RATE_WINDOW = 300_000;
const RATE_LIMIT = 5;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  if (rateMap.size > 300) {
    for (const [k, v] of rateMap) {
      if (now > v.resetAt) rateMap.delete(k);
    }
  }
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const interestSchema = z.object({
  feature_type: z.enum(["illustration", "video_story"]),
  story_id: z.string().optional(),
  anonymous_id: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  // LAUNCH-FIX: Body size limit (interest payloads are tiny, 4KB max)
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 4_000) {
    return NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = interestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 데이터입니다." }, { status: 400 });
  }

  const { feature_type, story_id, anonymous_id } = parsed.data;

  // Validate story_id if provided
  if (story_id && !isValidUUID(story_id)) {
    return NextResponse.json({ error: "잘못된 ID 형식입니다." }, { status: 400 });
  }

  // Create Supabase client (anon key — INSERT policy is open)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "서비스를 사용할 수 없습니다." }, { status: 503 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll() {},
    },
  });

  // Try to get authenticated user (optional)
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Guest user — no problem
  }

  // Insert interest click
  const { error } = await supabase.from("interest_clicks").insert({
    user_id: userId,
    story_id: story_id || null,
    anonymous_id: anonymous_id || null,
    feature_type,
  });

  if (error) {
    console.error("[Interest] Insert error:", error.message);
    return NextResponse.json({ error: "기록에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
