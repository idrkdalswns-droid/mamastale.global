import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, "").replace(/javascript:/gi, "").trim();
}

const PROFANITY_LIST = [
  "시발", "씨발", "씨벌", "ㅅㅂ", "ㅆㅂ",
  "병신", "ㅂㅅ", "지랄", "ㅈㄹ",
  "닥쳐", "꺼져", "새끼", "개새끼",
  "좆", "ㅈ같", "존나", "ㅈㄴ",
  "씹", "개같은", "미친년", "미친놈",
  "ㅄ", "ㅗ", "꼴값",
];

function containsProfanity(text: string): boolean {
  const normalized = text.replace(/\s/g, "").toLowerCase();
  return PROFANITY_LIST.some((word) => normalized.includes(word));
}

// GET: List reviews
export async function GET() {
  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ reviews: [] });
  }

  const { data: reviews } = await supabase
    .from("user_reviews")
    .select("id, author_alias, child_info, stars, content, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ reviews: reviews || [] });
}

// POST: Submit review
export async function POST(request: NextRequest) {
  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  try {
    const { authorAlias, childInfo, stars, content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "후기 내용을 입력해 주세요" }, { status: 400 });
    }
    if (!authorAlias?.trim()) {
      return NextResponse.json({ error: "별명을 입력해 주세요" }, { status: 400 });
    }

    const safeContent = sanitizeText(content.trim().slice(0, 500));
    const safeAlias = sanitizeText(authorAlias.trim().slice(0, 20));
    const safeChildInfo = childInfo ? sanitizeText(childInfo.trim().slice(0, 30)) : null;
    const safeStars = Math.min(5, Math.max(1, parseInt(stars) || 5));

    if (containsProfanity(safeContent) || containsProfanity(safeAlias)) {
      return NextResponse.json(
        { error: "부적절한 표현이 포함되어 있습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_reviews")
      .insert({
        author_alias: safeAlias,
        child_info: safeChildInfo,
        stars: safeStars,
        content: safeContent,
      })
      .select("id, author_alias, child_info, stars, content, created_at")
      .single();

    if (error) {
      console.error("[Reviews] Insert error:", error.message);
      return NextResponse.json({ error: "후기 등록에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ review: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
