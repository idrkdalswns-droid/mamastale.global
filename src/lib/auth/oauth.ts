"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type OAuthProvider = "kakao" | "google";

/**
 * Initiate OAuth sign-in with the given provider.
 *
 * IMPORTANT: Uses a vanilla @supabase/supabase-js client with implicit flow,
 * NOT the @supabase/ssr createBrowserClient. Reason:
 *
 * @supabase/ssr forces flowType:"pkce" which requires a code_verifier cookie
 * to survive the cross-domain OAuth redirect chain (our domain → Supabase →
 * Kakao/Google → Supabase → our domain). On mobile browsers and Cloudflare Pages,
 * this cookie can be lost, causing the PKCE code exchange to fail silently.
 *
 * With implicit flow, Supabase returns tokens directly in the URL hash fragment
 * (#access_token=...&refresh_token=...), which is always visible to client-side
 * JavaScript regardless of cookie state. The callback page then uses the SSR
 * client's setSession() to store them in cookies for server-side access.
 */
export async function signInWithOAuth(
  provider: OAuthProvider
): Promise<{ error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[OAuth] Missing Supabase env vars");
    return { error: "로그인 설정이 올바르지 않습니다." };
  }

  // Vanilla client with implicit flow — bypasses @supabase/ssr's forced PKCE
  const supabase = createSupabaseClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false, // Temporary client, don't persist
      detectSessionInUrl: false,
    },
  });

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`[OAuth] ${provider} sign-in error:`, error.message);
    return { error: "로그인에 실패했습니다. 다시 시도해 주세요." };
  }

  return { error: null };
}
