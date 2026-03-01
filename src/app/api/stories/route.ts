import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { incrementTickets } from "@/lib/supabase/tickets";
import { containsProfanity, sanitizeText } from "@/lib/utils/validation";

export const runtime = "edge";

// GET: List user's stories
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stories, error } = await sb.client
    .from("stories")
    .select("id, title, scenes, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Stories] List error:", error.message);
    return NextResponse.json({ error: "동화 목록을 불러올 수 없습니다." }, { status: 500 });
  }

  return sb.applyCookies(NextResponse.json({ stories: stories || [] }));
}

// POST: Save a new story (with ticket check & deduction)
export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const { scenes, sessionId, metadata, isPublic } = body;
    // Server-side input sanitization: enforce max lengths, strip HTML
    const title = typeof body.title === "string" ? sanitizeText(body.title.trim().slice(0, 200)) : "";
    const authorAlias = typeof body.authorAlias === "string" ? sanitizeText(body.authorAlias.trim().slice(0, 50)) : null;

    // UK-2/UK-3: Profanity check on title and alias (visible in community)
    if (title && containsProfanity(title)) {
      return NextResponse.json({ error: "부적절한 표현이 포함된 제목입니다." }, { status: 400 });
    }
    if (authorAlias && containsProfanity(authorAlias)) {
      return NextResponse.json({ error: "부적절한 표현이 포함된 별명입니다." }, { status: 400 });
    }

    // UK-5: Limit metadata size to prevent DB bloat
    if (metadata && JSON.stringify(metadata).length > 10_000) {
      return NextResponse.json({ error: "메타데이터가 너무 큽니다." }, { status: 400 });
    }

    // ─── Validate scenes BEFORE ticket deduction ───
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: "동화 장면 데이터가 필요합니다." }, { status: 400 });
    }
    if (scenes.length > 20) {
      return NextResponse.json({ error: "장면 수가 너무 많습니다." }, { status: 400 });
    }
    const validScenes = scenes.every(
      (s: unknown) =>
        typeof s === "object" && s !== null &&
        typeof (s as Record<string, unknown>).sceneNumber === "number" &&
        typeof (s as Record<string, unknown>).title === "string" &&
        typeof (s as Record<string, unknown>).text === "string"
    );
    if (!validScenes) {
      return NextResponse.json({ error: "잘못된 동화 장면 데이터입니다." }, { status: 400 });
    }

    // Atomic ticket check & deduction — prevents race condition
    let ticketsAfter = 0;

    const { data: profile } = await sb.client
      .from("profiles")
      .select("free_stories_remaining")
      .eq("id", user.id)
      .single();

    const remaining = profile?.free_stories_remaining ?? 0;
    if (remaining <= 0) {
      return NextResponse.json(
        { error: "no_tickets", message: "티켓이 부족합니다." },
        { status: 403 }
      );
    }

    // Deduct ticket FIRST (optimistic lock via conditional update)
    const { data: updatedProfile, error: deductError } = await sb.client
      .from("profiles")
      .update({
        free_stories_remaining: remaining - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .gte("free_stories_remaining", 1) // only deduct if still >= 1
      .select("free_stories_remaining")
      .single();

    if (deductError || !updatedProfile) {
      return NextResponse.json(
        { error: "no_tickets", message: "티켓이 부족합니다." },
        { status: 403 }
      );
    }

    ticketsAfter = updatedProfile.free_stories_remaining;

    // Validate session_id: must be a valid UUID or null
    // Client sends "session_${Date.now()}" which is NOT a UUID → skip FK
    const isValidUUID = sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

    // Build insert object — base columns only (always exist in DB)
    const storyInsert: Record<string, unknown> = {
      user_id: user.id,
      session_id: isValidUUID ? sessionId : null,
      title: title || "나의 치유 동화",
      scenes,
      metadata: metadata || {},
      status: "completed",
    };

    // Community columns (is_public, author_alias) require 002_community migration
    // Only include if explicitly requested — graceful fallback if columns missing
    const hasCommunityFields = isPublic !== undefined || authorAlias;
    if (hasCommunityFields) {
      storyInsert.is_public = isPublic || false;
      storyInsert.author_alias = authorAlias || null;
    }

    // Try insert
    let insertResult = await sb.client
      .from("stories")
      .insert(storyInsert)
      .select("id")
      .single();

    // If insert failed and we had community columns, retry without them
    // (community migration may not be applied yet)
    if (insertResult.error && hasCommunityFields) {
      console.warn("[Stories] Retrying without community columns:", insertResult.error.message);
      delete storyInsert.is_public;
      delete storyInsert.author_alias;
      insertResult = await sb.client
        .from("stories")
        .insert(storyInsert)
        .select("id")
        .single();
    }

    if (insertResult.error || !insertResult.data) {
      // Atomic rollback: +1 ticket back (prevents overwriting concurrent changes)
      await incrementTickets(sb.client, user.id, 1);
      console.error("[Stories] Insert failed:", insertResult.error?.message);
      return NextResponse.json({ error: "동화 저장에 실패했습니다." }, { status: 500 });
    }

    return sb.applyCookies(NextResponse.json({ id: insertResult.data.id, ticketsRemaining: ticketsAfter }));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
