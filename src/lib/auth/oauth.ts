"use client";

import { createClient } from "@/lib/supabase/client";

export type OAuthProvider = "kakao" | "google";

/**
 * Initiate OAuth sign-in with the given provider.
 * Redirects the browser to the provider's login page.
 * After authentication, Supabase redirects back to /auth/callback
 * where either PKCE code exchange or implicit flow token handling occurs.
 */
export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Must point to client-side page (not API route) because
      // Supabase may use implicit flow (hash fragment tokens)
      // which are only visible to client-side JavaScript.
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`[OAuth] ${provider} sign-in error:`, error.message);
  }
}
