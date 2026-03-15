export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";

// Rate limiting for referral endpoints
const REFERRAL_RATE_WINDOW = 60_000;
const referralRateMap = new Map<string, { count: number; resetAt: number }>();

function checkReferralRate(ip: string, limit: number): boolean {
  const now = Date.now();
  if (referralRateMap.size > 200) {
    for (const [k, v] of referralRateMap) { if (now > v.resetAt) referralRateMap.delete(k); }
  }
  const key = `${ip}`;
  const entry = referralRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    referralRateMap.set(key, { count: 1, resetAt: now + REFERRAL_RATE_WINDOW });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Resolve user from cookie or bearer token
async function resolveUser(
  sb: ReturnType<typeof createApiSupabaseClient>,
  request: NextRequest
) {
  if (!sb) return null;
  const { data } = await sb.client.auth.getUser();
  if (data.user) return data.user;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
    if (tokenData.user) return tokenData.user;
  }
  return null;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 for readability
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET: Retrieve or generate referral code + stats
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  if (!checkReferralRate(ip, 15)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const user = await resolveUser(sb, request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  // Get or create referral code
  const { data: profile } = await sb.client
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  let code = profile?.referral_code;

  if (!code) {
    // Generate unique code with retry
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const { error } = await sb.client
        .from("profiles")
        .update({ referral_code: code })
        .eq("id", user.id);
      if (!error) break;
      code = null;
    }
    if (!code) {
      return sb.applyCookies(
        NextResponse.json({ error: "코드 생성 실패. 다시 시도해주세요." }, { status: 500 })
      );
    }
  }

  // Get referral stats
  const { count } = await sb.client
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id)
    .eq("referrer_rewarded", true);

  return sb.applyCookies(
    NextResponse.json({
      code,
      referralCount: count || 0,
      ticketsEarned: count || 0,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mamastale-global.pages.dev"}/?ref=${code}`,
    })
  );
}

// POST: Claim a referral code (called during/after signup)
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!checkReferralRate(ip, 5)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const user = await resolveUser(sb, request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 8) {
    return NextResponse.json({ error: "유효하지 않은 추천 코드입니다." }, { status: 400 });
  }

  // Check if already referred
  const { data: myProfile } = await sb.client
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();

  if (myProfile?.referred_by) {
    return sb.applyCookies(
      NextResponse.json({ error: "이미 추천을 받으셨습니다." }, { status: 409 })
    );
  }

  // Find referrer by code
  const { data: referrer } = await sb.client
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .single();

  if (!referrer) {
    return sb.applyCookies(
      NextResponse.json({ error: "존재하지 않는 추천 코드입니다." }, { status: 404 })
    );
  }

  // Can't refer yourself
  if (referrer.id === user.id) {
    return sb.applyCookies(
      NextResponse.json({ error: "자신의 코드는 사용할 수 없습니다." }, { status: 400 })
    );
  }

  // Create referral record
  const { error: insertErr } = await sb.client.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    referrer_rewarded: true,
    referred_rewarded: true,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return sb.applyCookies(
        NextResponse.json({ error: "이미 추천을 받으셨습니다." }, { status: 409 })
      );
    }
    return sb.applyCookies(
      NextResponse.json({ error: "추천 처리 중 오류가 발생했습니다." }, { status: 500 })
    );
  }

  // Update referred_by
  await sb.client
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", user.id);

  // Award tickets to both (using service role for cross-user update)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && supabaseUrl) {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl, serviceKey);

    // +1 ticket to referrer
    await admin.rpc("increment_tickets", { p_user_id: referrer.id, p_count: 1 });
    // +1 ticket to referred
    await admin.rpc("increment_tickets", { p_user_id: user.id, p_count: 1 });
  }

  return sb.applyCookies(
    NextResponse.json({ success: true, message: "추천 보상이 지급되었습니다! 양쪽 모두 티켓 1장을 받았습니다." })
  );
}
