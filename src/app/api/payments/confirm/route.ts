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

export async function POST(request: NextRequest) {
  const tossSecretKey = process.env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    return NextResponse.json(
      { error: "결제 시스템이 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  // Authenticate user
  const sb = getSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { paymentKey, orderId, amount } = await request.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    // Confirm payment with Toss Payments API
    const encryptedKey = btoa(`${tossSecretKey}:`);
    const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encryptedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const confirmData = await confirmRes.json();

    if (!confirmRes.ok) {
      console.error("[Toss] Payment confirmation failed:", confirmData);
      return NextResponse.json(
        { error: confirmData.message || "결제 확인에 실패했습니다." },
        { status: 400 }
      );
    }

    // Determine ticket count based on amount
    let ticketCount = 1;
    if (amount >= 8000) {
      ticketCount = 5;
    }

    // Credit tickets to user's profile
    const { data: profile } = await sb.client
      .from("profiles")
      .select("free_stories_remaining")
      .eq("id", user.id)
      .single();

    const currentTickets = profile?.free_stories_remaining ?? 0;

    await sb.client
      .from("profiles")
      .update({
        free_stories_remaining: currentTickets + ticketCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    console.log(
      `[Toss] Payment confirmed: ${confirmData.orderId}, ` +
      `user=${user.id}, tickets +${ticketCount}, total=${currentTickets + ticketCount}`
    );

    return NextResponse.json({
      success: true,
      ticketsAdded: ticketCount,
      ticketsTotal: currentTickets + ticketCount,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[Toss] Confirm error:", errMsg);
    return NextResponse.json(
      { error: "결제 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
