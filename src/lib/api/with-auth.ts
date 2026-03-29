/**
 * 인증 래퍼 — API 라우트의 인증 보일러플레이트를 제거합니다.
 *
 * 규약:
 * - handler는 raw NextResponse만 반환 (applyCookies 호출 금지)
 * - withAuth가 마지막에 한 번만 sb.applyCookies(result) 호출
 * - ctx에서 applyCookies를 의도적으로 제외하여 이중 호출 방지
 *
 * 사용법:
 *   export const GET = withAuth(async (request, { user, sb }) => {
 *     // ... 비즈니스 로직 ...
 *     return NextResponse.json({ data });
 *   });
 *
 * 동적 라우트:
 *   export const GET = withAuth<{ id: string }>(async (request, { user, sb }, params) => {
 *     const { id } = params;
 *     // ...
 *   });
 */
import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { API_ERRORS } from "./api-errors";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  /** Supabase client (non-null). Do NOT call sb.applyCookies() — withAuth handles it. */
  sb: NonNullable<ReturnType<typeof createApiSupabaseClient>>;
}

export function withAuth<P = void>(
  handler: (request: NextRequest, ctx: AuthContext, params: P) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    routeCtx?: { params?: Promise<P> },
  ): Promise<NextResponse> => {
    const sb = createApiSupabaseClient(request);
    if (!sb) {
      return NextResponse.json(API_ERRORS.DB_NOT_CONFIGURED, { status: 503 });
    }

    const user = await resolveUser(sb.client, request);
    if (!user) {
      return sb.applyCookies(
        NextResponse.json(API_ERRORS.AUTH_REQUIRED, { status: 401 }),
      );
    }

    const params = (routeCtx?.params ? await routeCtx.params : undefined) as P;

    try {
      const result = await handler(request, { user, sb }, params);
      return sb.applyCookies(result);
    } catch (err) {
      console.error("[withAuth] Unhandled error:", err);
      return sb.applyCookies(
        NextResponse.json(API_ERRORS.INTERNAL, { status: 500 }),
      );
    }
  };
}
