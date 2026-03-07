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
    }) {
      const now = Date.now();
      if (now - lastReport < MIN_INTERVAL) return;
      lastReport = now;

      // Fire-and-forget
      fetch("/api/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silently fail — error reporting should never break the app
      });
    }

    // ─── Global error handler ───
    function handleError(event: ErrorEvent) {
      reportError({
        message: event.message || "Unknown error",
        source: "window.onerror",
        stack: event.error?.stack,
      });
    }

    // ─── Unhandled promise rejection ───
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      reportError({
        message: reason instanceof Error ? reason.message : String(reason),
        source: "unhandledrejection",
        stack: reason instanceof Error ? reason.stack : undefined,
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
