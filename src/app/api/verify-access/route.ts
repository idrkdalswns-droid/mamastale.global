import { NextRequest, NextResponse } from "next/server";
import { getClientIP } from "@/lib/utils/validation";

export const runtime = "edge";

// LAUNCH-FIX: Rate limiting to prevent brute-force on access key
const ACCESS_RATE_WINDOW = 60_000;
const ACCESS_RATE_LIMIT = 5;
const accessRateMap = new Map<string, { count: number; resetAt: number }>();
function checkAccessRate(ip: string): boolean {
  const now = Date.now();
  if (accessRateMap.size > 300) {
    for (const [k, v] of accessRateMap) { if (now > v.resetAt) accessRateMap.delete(k); }
  }
  const entry = accessRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    accessRateMap.set(ip, { count: 1, resetAt: now + ACCESS_RATE_WINDOW });
    return true;
  }
  if (entry.count >= ACCESS_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/** Constant-time string comparison to prevent timing attacks.
 *  Compares length via XOR to avoid early-return length leakage. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // Compare lengths in constant time (XOR ≠ 0 if different)
  let result = bufA.length ^ bufB.length;
  // Compare bytes up to the longer string's length (prevents out-of-bounds)
  const maxLen = Math.max(bufA.length, bufB.length);
  for (let i = 0; i < maxLen; i++) {
    result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
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
  // LAUNCH-FIX: Rate limit brute-force attempts
  const ip = getClientIP(request);
  if (!checkAccessRate(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

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
