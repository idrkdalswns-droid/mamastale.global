import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectUrl = new URL("/", request.url);

  if (code) {
    // Collect cookies to set on the response
    const cookiesToReturn: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((cookie) => {
              cookiesToReturn.push(cookie);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(new URL("/login?error=auth", request.url));
    }

    // Build redirect response with auth cookies
    const response = NextResponse.redirect(redirectUrl);
    cookiesToReturn.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Record<string, string>);
    });
    return response;
  }

  return NextResponse.redirect(redirectUrl);
}
