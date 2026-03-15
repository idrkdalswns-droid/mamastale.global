"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { detectInAppBrowser } from "@/lib/utils/browser-detect";

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
  // Google은 인앱 브라우저(WebView)에서 OAuth를 차단함 (403 disallowed_useragent)
  // 카카오 로그인은 인앱에서도 정상 동작하므로 Google만 차단
  if (provider === "google" && detectInAppBrowser()) {
    return { error: "inapp_google" };
  }
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
