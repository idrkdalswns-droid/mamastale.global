import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;

  // ─── Site Access Gate ───
  // Set SITE_ACCESS_KEY env var to enable (Cloudflare dashboard)
  // Remove or leave empty to disable the gate
  const accessKey = process.env.SITE_ACCESS_KEY;
  if (accessKey) {
    // Allow social media crawlers through so OG link previews work
    const ua = request.headers.get("user-agent") || "";
    const isCrawler = /kakaotalk-scrap|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|LineBot|Discordbot|Googlebot|bingbot|Yeti/i.test(ua);

    const isAccessPage = pathname === "/access";
    const isVerifyApi = pathname === "/api/verify-access";
    const isApiRoute = pathname.startsWith("/api/");
    const hasAccess = request.cookies.get("site-access")?.value === "verified";

    if (!hasAccess && !isAccessPage && !isVerifyApi && !isCrawler) {
      // Block API routes with 403, redirect pages to /access
      if (isApiRoute) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      // Preserve original URL (including ?ref= query params) for redirect after access
      const originalPath = pathname + (request.nextUrl.search || "");
      const accessUrl = new URL("/access", request.url);
      if (originalPath !== "/") {
        accessUrl.searchParams.set("next", originalPath);
      }
      return NextResponse.redirect(accessUrl);
    }

    // Already verified — skip access page
    if (hasAccess && isAccessPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

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
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  try {
    // Refresh session
    const { data: { user } } = await supabase.auth.getUser();

    // Protected routes — redirect to login if not authenticated
    if (isProtected && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If logged in and visiting auth pages, redirect to home
    if (isAuthPage && user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (e) {
    console.error("Middleware auth check failed:", e);
    // Fail-closed for protected routes
    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
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
