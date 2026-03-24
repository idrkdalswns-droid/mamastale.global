/**
 * Shared auth utility: Cookie-first, Bearer token fallback.
 *
 * Extracts the authenticated user from a Supabase client + request pair.
 * This replaces the inline-duplicated auth pattern found in each API route.
 *
 * Usage:
 *   const sb = createApiSupabaseClient(request);
 *   if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });
 *   const user = await resolveUser(sb.client, request);
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
import { SupabaseClient, User } from "@supabase/supabase-js";

export async function resolveUser(
  supabase: SupabaseClient,
  request: Request,
  /** Log namespace for debugging auth failures (e.g. "Stories", "Tickets") */
  namespace = "API"
): Promise<User | null> {
  // 1차: Cookie 기반 인증 (기본)
  const { data, error } = await supabase.auth.getUser();
  if (data.user) return data.user;

  // 2차: Authorization: Bearer 토큰 fallback
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data: tokenData } = await supabase.auth.getUser(
      authHeader.slice(7)
    );
    if (tokenData.user) {
      console.warn(`[${namespace}] Auth resolved via Bearer token fallback`);
      return tokenData.user;
    }
  }

  if (error) {
    console.error(`[${namespace}] Auth failed:`, error.message);
  }
  return null;
}
