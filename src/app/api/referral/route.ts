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

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() { return []; },
      setAll() {},
    },
  });
}

// 6자리 랜덤 추천 코드 생성
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외 (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/referral — 내 추천 코드 조회 (없으면 생성)
export async function GET(request: NextRequest) {
  const sb = getSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 기존 추천 코드 확인
  const { data: profile } = await sb.client
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  if (profile?.referral_code) {
    const { count } = await sb.client
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.id);

    return NextResponse.json({
      code: profile.referral_code,
      referralCount: count || 0,
    });
  }

  // 코드 생성 (중복 방지 최대 5회 시도)
  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await admin
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", user.id);

    if (!error) {
      return NextResponse.json({ code, referralCount: 0 });
    }
  }

  return NextResponse.json({ error: "코드 생성에 실패했습니다." }, { status: 500 });
}

// POST /api/referral — 추천 코드 적용 (가입 후 호출)
export async function POST(request: NextRequest) {
  const sb = getSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { referralCode } = await request.json();
  if (!referralCode || typeof referralCode !== "string") {
    return NextResponse.json({ error: "추천 코드가 필요합니다." }, { status: 400 });
  }

  const code = referralCode.trim().toUpperCase();
  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  // 1. 추천인 찾기
  const { data: referrer } = await admin
    .from("profiles")
    .select("id, free_stories_remaining")
    .eq("referral_code", code)
    .single();

  if (!referrer) {
    return NextResponse.json({ error: "유효하지 않은 추천 코드입니다." }, { status: 404 });
  }

  // 자기 자신 추천 방지
  if (referrer.id === user.id) {
    return NextResponse.json({ error: "본인의 추천 코드는 사용할 수 없습니다." }, { status: 400 });
  }

  // 2. 이미 추천받은 적 있는지 확인
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이미 추천 혜택을 받으셨습니다." }, { status: 409 });
  }

  // 3. 추천 기록 생성
  const { error: insertError } = await admin
    .from("referrals")
    .insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referrer_rewarded: true,
      referred_rewarded: true,
    });

  if (insertError) {
    return NextResponse.json({ error: "추천 적용에 실패했습니다." }, { status: 500 });
  }

  // 4. 추천인에게 티켓 +1
  await admin
    .from("profiles")
    .update({
      free_stories_remaining: (referrer.free_stories_remaining || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referrer.id);

  // 5. 신규 가입자에게도 티켓 +1
  const { data: myProfile } = await admin
    .from("profiles")
    .select("free_stories_remaining")
    .eq("id", user.id)
    .single();

  if (myProfile) {
    await admin
      .from("profiles")
      .update({
        free_stories_remaining: (myProfile.free_stories_remaining || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  return NextResponse.json({
    success: true,
    message: "추천 혜택이 적용되었습니다! 티켓 1장이 추가되었어요.",
  });
}
