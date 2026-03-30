/**
 * Route protection logic extracted from middleware.ts for testability.
 */

const PROTECTED_PATHS = ["/dashboard", "/library", "/settings", "/teacher", "/vending", "/admin", "/dalkkak/play"];
const PUBLIC_SUB_PATHS = ["/dalkkak/result"];
const AUTH_PATHS = ["/login", "/signup", "/reset-password"];

/** Returns true if the pathname requires authentication */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p))
    && !PUBLIC_SUB_PATHS.some((p) => pathname.startsWith(p));
}

/** Returns true if the pathname is an auth page (login/signup/reset) */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname.startsWith(p));
}
