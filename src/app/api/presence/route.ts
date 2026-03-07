import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIP } from "@/lib/utils/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

// ─── Rate limiting (10 per 60s per IP) ───
const RATE_WINDOW = 60_000;
const RATE_LIMIT = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  if (rateMap.size > 500) {
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

const presenceSchema = z.object({
  anonymous_id: z.string().min(10).max(64),
  page: z.enum(["home", "chat", "other"]),
});

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = presenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { anonymous_id, page } = parsed.data;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Upsert presence (ON CONFLICT anonymous_id DO UPDATE)
  await supabase
    .from("presence")
    .upsert(
      { anonymous_id, page, last_seen: new Date().toISOString() },
      { onConflict: "anonymous_id" }
    );

  // ~10% chance: cleanup stale entries
  if (Math.random() < 0.1) {
    try { await supabase.rpc("cleanup_stale_presence"); } catch { /* ignore */ }
  }

  // Count active users (last 60 seconds)
  const cutoff = new Date(Date.now() - 60_000).toISOString();

  const [totalResult, creatingResult] = await Promise.all([
    supabase
      .from("presence")
      .select("id", { count: "exact", head: true })
      .gte("last_seen", cutoff),
    supabase
      .from("presence")
      .select("id", { count: "exact", head: true })
      .gte("last_seen", cutoff)
      .eq("page", "chat"),
  ]);

  return NextResponse.json({
    total: totalResult.count ?? 0,
    creating: creatingResult.count ?? 0,
  });
}
