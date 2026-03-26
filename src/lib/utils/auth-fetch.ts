"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * C1 FIX: Centralized auth fetch wrapper.
 * Ensures every API call includes:
 * 1. Authorization: Bearer token (when available)
 * 2. credentials: "include" (cookie fallback)
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

    return fetch(url, {
      ...init,
      headers,
      credentials: "include", // Cookie auth fallback
    });
  };
}

/**
 * One-shot version for cases where you don't need token caching.
 * Fetches fresh token each call.
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

  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}
