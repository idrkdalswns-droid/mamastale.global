/**
 * POST /api/tq/event — 딸깍 동화 이벤트 트래킹
 * Fire-and-forget: 실패해도 200 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { createInMemoryLimiter } from "@/lib/utils/rate-limiter";

export const runtime = "edge";

const limiter = createInMemoryLimiter("tq:event", { maxEntries: 500 });

const eventTypes = [
  "phase_started",
  "question_answered",
  "phase_completed",
  "interstitial_skipped",
  "q20_started",
  "q20_submitted",
  "q20_skipped",
  "story_generation_started",
  "story_read_completed",
  "share_clicked",
  "feedback_submitted",
] as const;

const requestSchema = z.object({
  session_id: z.string().uuid(),
  event_type: z.enum(eventTypes),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb)
    return NextResponse.json({ ok: true });

  const user = await resolveUser(sb.client, request, "TQ-Event");
  if (!user)
    return NextResponse.json({ ok: true }); // fire-and-forget

  if (!limiter.check(user.id, 60, 60_000))
    return NextResponse.json({ ok: true }); // rate limit but still 200

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: true });

  const { session_id, event_type, metadata } = parsed.data;

  // Service role로 삽입 (RLS 우회)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && supabaseUrl) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/tq_events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          session_id,
          user_id: user.id,
          event_type,
          metadata: metadata ?? null,
        }),
      });
    } catch {
      // fire-and-forget: 이벤트 손실 허용
    }
  }

  return sb.applyCookies(NextResponse.json({ ok: true }));
}
