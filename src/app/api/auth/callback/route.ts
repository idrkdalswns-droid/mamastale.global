import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Forward to client-side page for code exchange
  // Browser client can access PKCE code_verifier from localStorage
  const clientUrl = new URL("/auth/callback", origin);
  if (code) clientUrl.searchParams.set("code", code);

  return NextResponse.redirect(clientUrl.toString());
}
