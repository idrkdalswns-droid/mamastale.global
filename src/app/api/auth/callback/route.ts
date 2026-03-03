import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Server-side OAuth callback handler.
 *
 * Flow: OAuth provider → Supabase → /api/auth/callback?code=XXX
 *
 * Exchanges the PKCE auth code for a session on the server,
 * sets session cookies on the response, then redirects to home.
 * This is more reliable than client-side exchange because the
 * server can read the code_verifier cookie directly from the request.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // CTO-FIX: Validate 'next' param to prevent open redirect attacks
  const rawNext = searchParams.get("next") ?? "/";
  const next = (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")) ? rawNext : "/";

  if (!code) {
    console.error("[AuthCallback] No code in callback URL");
    const errorUrl = new URL("/auth/callback", origin);
    errorUrl.searchParams.set("error", "no_code");
    return NextResponse.redirect(errorUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[AuthCallback] Missing Supabase env vars");
    const errorUrl = new URL("/auth/callback", origin);
    errorUrl.searchParams.set("error", "config");
    return NextResponse.redirect(errorUrl);
  }

  // Prepare success redirect (cookies will be set on this response)
  const redirectUrl = new URL(next, origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Update request cookies so subsequent getAll() calls see fresh values
          request.cookies.set(name, value);
          // Set cookies on the redirect response
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[AuthCallback] Code exchange error:", error.message);

    const isCodeVerifierError =
      error.message.includes("code_verifier") ||
      error.message.includes("code verifier") ||
      error.message.includes("both auth code and code verifier");

    const errorUrl = new URL("/auth/callback", origin);
    errorUrl.searchParams.set(
      "error",
      isCodeVerifierError ? "code_verifier" : "exchange_failed"
    );
    return NextResponse.redirect(errorUrl);
  }

  // Success — redirect to home (or next page) with session cookies
  return response;
}
