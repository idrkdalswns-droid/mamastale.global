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

  if (error) {
    console.error("[Tickets] DB error:", error.message);
    return NextResponse.json({ error: "티켓 정보를 불러올 수 없습니다." }, { status: 500 });
  }

  return sb.applyCookies(NextResponse.json({
    remaining: profile?.free_stories_remaining ?? 0,
  }));
}
