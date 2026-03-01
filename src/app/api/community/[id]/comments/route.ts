import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

/** Anon-key client for public reads — RLS enforced */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

function getAuthClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });
}

/** Strip angle brackets and javascript: protocol */
function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .trim();
}

/** Korean profanity filter */
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

// GET: List comments for a story (only if story is public)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ comments: [] });
  }

  // Verify the story is public before returning its comments
  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("is_public", true)
    .single();

  if (!story) {
    return NextResponse.json({ comments: [] });
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("id, content, author_alias, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({ comments: comments || [] });
}

// POST: Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await params;

  const supabase = getAuthClient(request);
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const { content, authorAlias } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요" }, { status: 400 });
    }

    // Sanitize inputs (strip HTML tags, JS protocol)
    const safeContent = sanitizeText(content.trim().slice(0, 500));
    const safeAlias = sanitizeText(
      (authorAlias || user.user_metadata?.name || "익명").slice(0, 50)
    );

    // Profanity check
    if (containsProfanity(safeContent) || containsProfanity(safeAlias)) {
      return NextResponse.json(
        { error: "부적절한 표현이 포함되어 있습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        story_id: storyId,
        content: safeContent,
        author_alias: safeAlias,
      })
      .select("id, content, author_alias, created_at")
      .single();

    if (error) {
      console.error("[Comments] Insert error:", error.message);
      return NextResponse.json({ error: "댓글 등록에 실패했습니다." }, { status: 500 });
    }

    // Atomic comment count increment (no race condition)
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      await serviceClient.rpc("increment_story_counter", {
        p_story_id: storyId,
        p_column: "comment_count",
        p_delta: 1,
      });
    }

    return NextResponse.json({ comment: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
