import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;

  // R2: Handle CORS preflight (OPTIONS) for mobile/WebView Bearer token requests
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const allowedOrigin = new URL(request.url).origin;
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // CSRF: validate Origin for state-changing API requests
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/") &&
      ["POST", "DELETE", "PATCH", "PUT"].includes(request.method)) {
    // R2: Skip CSRF check for Bearer token requests (CSRF-proof by definition)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const allowedOrigin = new URL(request.url).origin;

      if (origin) {
        if (origin !== allowedOrigin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (referer) {
        try {
          if (new URL(referer).origin !== allowedOrigin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // ─── Security Response Headers ───
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  const isDev = process.env.NODE_ENV === "development";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://pagead2.googlesyndication.com https://js.stripe.com https://*.tosspayments.com https://t1.kakaocdn.net https://developers.kakao.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://t1.kakaocdn.net https://k.kakaocdn.net",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tosspayments.com https://api.stripe.com https://www.google-analytics.com https://kapi.kakao.com https://accounts.google.com https://oauth2.googleapis.com",
      "frame-src https://js.stripe.com https://*.tosspayments.com https://accounts.kakao.com https://accounts.google.com https://www.youtube.com",
      "frame-ancestors 'none'",
      "worker-src 'self'",
      "manifest-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.kakao.com https://accounts.google.com https://*.tosspayments.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  // No-store for API responses with sensitive data
  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  // ─── Safety net: redirect /?code= to /auth/callback ───
  // Handles legacy email links or misconfigured redirects
  // CTO-FIX: Forward all auth params (code, type, error_description, etc.)
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = new URL("/auth/callback", request.url);
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      callbackUrl.searchParams.set(key, value);
    }
    return NextResponse.redirect(callbackUrl);
  }

  // Skip auth check if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const protectedPaths = ["/dashboard", "/library", "/settings"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const authPaths = ["/login", "/signup", "/reset-password"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  // LAUNCH-FIX: Only call getUser() for protected/auth pages to avoid
  // unnecessary Supabase Auth API calls on every public page request.
  if (!isProtected && !isAuthPage) {
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

  try {
    // Refresh session — only runs for protected/auth pages
    const { data: { user } } = await supabase.auth.getUser();

    // Protected routes — redirect to login if not authenticated
    if (isProtected && !user) {
      const loginUrl = new URL("/login", request.url);
      // Strict redirect validation: only allow known local paths (prevent open redirect)
      const ALLOWED_REDIRECT_PREFIXES = ["/library", "/dashboard", "/settings", "/community", "/pricing", "/feature-requests"];
      if (ALLOWED_REDIRECT_PREFIXES.some((p) => pathname.startsWith(p))) {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // If logged in and visiting auth pages, redirect to home
    if (isAuthPage && user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (e) {
    console.error("Middleware auth check failed:", e instanceof Error ? e.name : "Unknown");
    // Fail-closed for protected routes
    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      const ALLOWED_REDIRECT_PREFIXES = ["/library", "/dashboard", "/settings", "/community", "/pricing", "/feature-requests"];
      if (ALLOWED_REDIRECT_PREFIXES.some((p) => pathname.startsWith(p))) {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|fonts/|api/webhooks).*)",
  ],
};
