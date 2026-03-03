import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// GET: Check remaining tickets for current user
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await sb.client
    .from("profiles")
    .select("free_stories_remaining")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Tickets] DB error: code=", error.code);
    return sb.applyCookies(NextResponse.json({ error: "티켓 정보를 불러올 수 없습니다." }, { status: 500 }));
  }

  // New user — no profile row yet → auto-create with 1 free ticket
  if (!profile) {
    const { data: newProfile, error: upsertErr } = await sb.client
      .from("profiles")
      .upsert({
        id: user.id,
        free_stories_remaining: 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      .select("free_stories_remaining")
      .single();

    if (upsertErr) {
      console.error("[Tickets] Profile create error:", upsertErr.code);
      return sb.applyCookies(NextResponse.json({ error: "티켓 정보를 불러올 수 없습니다." }, { status: 500 }));
    }

    return sb.applyCookies(NextResponse.json({
      remaining: newProfile?.free_stories_remaining ?? 1,
    }));
  }

  return sb.applyCookies(NextResponse.json({
    remaining: profile.free_stories_remaining ?? 0,
  }));
}
