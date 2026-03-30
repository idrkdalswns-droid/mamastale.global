"use client";

import { useEffect } from "react";

/**
 * Global client-side error reporter.
 *
 * Captures unhandled errors and promise rejections,
 * sends them to /api/errors/report for centralized logging.
 *
 * Place this component once in the root layout.
 */
export function ErrorReporter() {
  useEffect(() => {
    // Debounce: avoid flooding the API
    let lastReport = 0;
    const MIN_INTERVAL = 5000; // 5 seconds between reports

    function reportError(data: {
      message: string;
      source: string;
      stack?: string;
      error?: Error;
    }) {
      const now = Date.now();
      if (now - lastReport < MIN_INTERVAL) return;
      lastReport = now;

      // Fire-and-forget to Supabase
      fetch("/api/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: data.message,
          source: data.source,
          stack: data.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silently fail — error reporting should never break the app
      });

      // Lazy-load Sentry and forward the error (if DSN configured)
      if (data.error) {
        import("@/lib/sentry").then((m) => m.captureError(data.error!)).catch(() => {});
      }
    }

    // ─── Global error handler ───
    function handleError(event: ErrorEvent) {
      reportError({
        message: event.message || "Unknown error",
        source: "window.onerror",
        stack: event.error?.stack,
        error: event.error instanceof Error ? event.error : undefined,
      });
    }

    // ─── Unhandled promise rejection ───
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      reportError({
        message: reason instanceof Error ? reason.message : String(reason),
        source: "unhandledrejection",
        stack: reason instanceof Error ? reason.stack : undefined,
        error: reason instanceof Error ? reason : undefined,
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null; // This component renders nothing
}
