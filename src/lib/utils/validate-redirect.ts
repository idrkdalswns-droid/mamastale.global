/**
 * Redirect URL validation utility.
 * Prevents open redirect attacks by whitelisting allowed path prefixes.
 */

const ALLOWED_REDIRECT_PREFIXES = [
  "/library",
  "/dashboard",
  "/settings",
  "/community",
  "/pricing",
  "/feature-requests",
  "/teacher",
  "/diy",
  "/dalkkak",
  "/vending",
];

export function isAllowedRedirect(url: string): boolean {
  if (url.startsWith("//") || url.includes("://")) return false;
  return ALLOWED_REDIRECT_PREFIXES.some((p) => url.startsWith(p));
}
