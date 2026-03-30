"use client";

import { createClient } from "@/lib/supabase/client";

// ─── 2-16: Auto-report 5xx fetch errors to /api/errors/report ───
let lastFetchReport = 0;
const FETCH_REPORT_INTERVAL = 5000; // 5s debounce, same as ErrorReporter
const ERROR_REPORT_PATH = "/api/errors/report";

function reportFetchError(fetchUrl: string, status: number, method: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastFetchReport < FETCH_REPORT_INTERVAL) return;
  // Avoid recursive reporting
  if (fetchUrl.includes(ERROR_REPORT_PATH)) return;
  lastFetchReport = now;

  fetch(ERROR_REPORT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Fetch ${method} ${status}: ${fetchUrl}`,
      source: "auth-fetch",
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {});
}

/**
 * C1 FIX: Centralized auth fetch wrapper.
 * Ensures every API call includes:
 * 1. Authorization: Bearer token (when available)
 * 2. credentials: "include" (cookie fallback)
 * 3. Auto-reports 5xx errors (2-16)
 *
 * Usage:
 *   const authFetch = createAuthFetch();
 *   const res = await authFetch("/api/stories/123", {
 *     method: "PATCH",
 *     body: JSON.stringify({ title: "..." }),
 *   });
 *
 * For JSON requests, Content-Type is auto-set when body is a string.
 */
export function createAuthFetch() {
  // Cache token per createAuthFetch() instance
  let cachedToken: string | null = null;

  async function getToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;
    try {
      const supabase = createClient();
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      cachedToken = session?.access_token ?? null;
      return cachedToken;
    } catch {
      return null;
    }
  }

  return async function authFetch(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const token = await getToken();
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Auto-set Content-Type for JSON string bodies
    if (typeof init?.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: "include", // Cookie auth fallback
    });

    // 2-16: Auto-report server errors
    if (res.status >= 500) {
      reportFetchError(url, res.status, init?.method || "GET");
    }

    return res;
  };
}

/**
 * One-shot version for cases where you don't need token caching.
 * Fetches fresh token each call. Auto-reports 5xx errors (2-16).
 */
export async function authFetchOnce(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  try {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
    }
  } catch {
    /* cookie auth will serve as fallback */
  }

  if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  // 2-16: Auto-report server errors
  if (res.status >= 500) {
    reportFetchError(url, res.status, init?.method || "GET");
  }

  return res;
}
