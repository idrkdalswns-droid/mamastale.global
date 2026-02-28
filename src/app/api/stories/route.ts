import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

function getSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const response = NextResponse.next();
  return {
    client: createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }),
    response,
  };
}

// GET: List user's stories
export async function GET(request: NextRequest) {
  const sb = getSupabaseClient(request);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stories: stories || [] });
}

// POST: Save a new story (with ticket check & deduction)
export async function POST(request: NextRequest) {
  const sb = getSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, scenes, sessionId, metadata, isPublic, authorAlias } = await request.json();

    // Check ticket balance before saving
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

    // Save the story
    const { data, error } = await sb.client
      .from("stories")
      .insert({
        user_id: user.id,
        session_id: sessionId || null,
        title: title || "나의 치유 동화",
        scenes,
        metadata: metadata || {},
        status: "completed",
        is_public: isPublic || false,
        author_alias: authorAlias || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduct 1 ticket after successful save
    await sb.client
      .from("profiles")
      .update({
        free_stories_remaining: Math.max(0, remaining - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ id: data.id, ticketsRemaining: remaining - 1 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
