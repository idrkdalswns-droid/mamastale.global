import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

function cookieOptions(request: NextRequest) {
  const isLocalhost = request.headers.get("host")?.includes("localhost");
  return {
    httpOnly: true,
    secure: !isLocalhost, // secure=false on localhost (HTTP) so cookie actually sets
    sameSite: "lax" as const,
    path: "/",
    // No maxAge → session cookie (expires when browser closes)
  };
}

export async function POST(request: NextRequest) {
  const accessKey = process.env.SITE_ACCESS_KEY;

  // No access key configured — gate is disabled
  if (!accessKey) {
    const res = NextResponse.json({ success: true });
    res.cookies.set("site-access", "verified", cookieOptions(request));
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

    if (!timingSafeEqual(key.trim(), accessKey)) {
      return NextResponse.json(
        { error: "보안 키가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("site-access", "verified", cookieOptions(request));

    return response;
  } catch {
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
