import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Skip auth check if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const protectedPaths = ["/dashboard", "/library"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  try {
    // Refresh session
    const { data: { user } } = await supabase.auth.getUser();

    // Protected routes — redirect to login if not authenticated
    if (isProtected && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If logged in and visiting auth pages, redirect to home
    if (isAuthPage && user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (e) {
    console.error("Middleware auth check failed:", e);
    // Fail-closed for protected routes — redirect to login on error
    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Non-protected routes: allow through (fail-open for public pages)
  }

  return response;
}

export const config = {
  matcher: [
    // Include login/signup so logged-in user redirect works
    // Exclude static assets, api webhooks
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)",
  ],
};
