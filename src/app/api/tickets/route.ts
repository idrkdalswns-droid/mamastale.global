import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// GET: Check remaining tickets + first purchase eligibility
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  // CTO-FIX: Try cookie auth first, then Bearer token fallback
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: tokenData } = await sb.client.auth.getUser(token);
      user = tokenData.user;
    }
  }
  if (!user) {
    // CTO-FIX: applyCookies was missing on 401 response
    return sb.applyCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
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

  let remaining = 0;

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

    remaining = newProfile?.free_stories_remaining ?? 1;
  } else {
    remaining = profile.free_stories_remaining ?? 0;
  }

  // Check first purchase eligibility: ≤1 completed stories means first purchase
  let isFirstPurchase = true;
  try {
    const { count } = await sb.client
      .from("stories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");
    isFirstPurchase = (count ?? 0) <= 1;
  } catch {
    // If stories query fails, default to false for safety
    isFirstPurchase = false;
  }

  return sb.applyCookies(NextResponse.json({ remaining, isFirstPurchase }));
}
