import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const accessKey = process.env.SITE_ACCESS_KEY;

  // No access key configured — gate is disabled
  if (!accessKey) {
    const res = NextResponse.json({ success: true });
    res.cookies.set("site-access", "verified", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
    });
    return res;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { key } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "보안 키를 입력해 주세요." }, { status: 400 });
    }

    if (key.trim() !== accessKey) {
      return NextResponse.json(
        { error: "보안 키가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("site-access", "verified", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch {
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
