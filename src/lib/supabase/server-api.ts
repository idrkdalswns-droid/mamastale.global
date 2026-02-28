/**
 * Supabase server client for API routes.
 *
 * Unlike middleware (which returns the same NextResponse), API routes
 * create new NextResponse.json() objects. This utility collects auth
 * refresh cookies and applies them to any response via applyCookies().
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

interface CookieEntry {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export function createApiSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const pendingCookies: CookieEntry[] = [];

  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  /**
   * Apply any auth-refresh cookies to the given NextResponse.
   * Call this before returning any JSON response from an API route.
   */
  function applyCookies(response: NextResponse): NextResponse {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options as Record<string, unknown>);
    }
    return response;
  }

  return { client, applyCookies };
}
