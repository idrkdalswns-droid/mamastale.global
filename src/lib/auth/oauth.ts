"use client";

import { createClient } from "@/lib/supabase/client";

export type OAuthProvider = "kakao" | "google";

/**
 * Initiate OAuth sign-in with the given provider.
 * Redirects the browser to the provider's login page.
 * After authentication, Supabase redirects back to /auth/callback
 * where the existing PKCE code exchange handles session creation.
 */
export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`[OAuth] ${provider} sign-in error:`, error.message);
  }
}
