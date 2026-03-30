/**
 * Sentry lazy initializer — only loads when first error occurs.
 *
 * Uses @sentry/browser (NOT @sentry/nextjs) for Cloudflare Pages compatibility.
 * Requires NEXT_PUBLIC_SENTRY_DSN environment variable.
 *
 * Integration with ErrorReporter:
 * - ErrorReporter handles window.onerror + unhandledrejection
 * - Sentry receives errors via manual captureException (no GlobalHandlers)
 * - This avoids duplicate captures
 */

let initPromise: Promise<typeof import("@sentry/browser")> | null = null;

export async function captureError(error: Error): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return;

  try {
    if (!initPromise) {
      initPromise = import("@sentry/browser").then((Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV,
          // ErrorReporter already handles GlobalHandlers — avoid double capture
          integrations: (defaults) =>
            defaults.filter(
              (i) => i.name !== "GlobalHandlers" && i.name !== "Dedupe"
            ),
        });
        return Sentry;
      });
    }

    const Sentry = await initPromise;
    Sentry.captureException(error);
  } catch {
    // Sentry should never break the app
  }
}
