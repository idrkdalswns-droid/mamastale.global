/**
 * JSON 파싱 + Zod 검증 유틸.
 * try-catch + safeParse 보일러플레이트를 29개 라우트에서 1줄로 줄입니다.
 */
import type { ZodSchema } from "zod";
import { NextResponse } from "next/server";
import { API_ERRORS } from "./api-errors";

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function parseRequestJSON<T>(
  request: Request,
  schema: ZodSchema<T>,
  applyCookies?: (res: NextResponse) => NextResponse,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    const res = NextResponse.json(API_ERRORS.INVALID_JSON, { status: 400 });
    return { success: false, response: applyCookies ? applyCookies(res) : res };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || API_ERRORS.INVALID_JSON.error;
    const res = NextResponse.json({ error: msg }, { status: 400 });
    return { success: false, response: applyCookies ? applyCookies(res) : res };
  }

  return { success: true, data: parsed.data };
}
