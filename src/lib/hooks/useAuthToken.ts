"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * T-5: Centralized auth token hook.
 * Replaces repeated getSession() calls scattered across components.
 *
 * Usage:
 *   const { getHeaders } = useAuthToken();
 *   const headers = await getHeaders();
 *   fetch(url, { headers });
 */
export function useAuthToken() {
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Fetch initial token
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        tokenRef.current = session?.access_token ?? null;
      } catch {
        tokenRef.current = null;
      } finally {
        setIsLoading(false);
      }
    })();

    // Keep token fresh on auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: { access_token?: string } | null) => {
        tokenRef.current = session?.access_token ?? null;
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /**
   * Returns headers object with Authorization bearer token.
   * Optionally merges with Content-Type for JSON requests.
   */
  const getHeaders = useCallback(
    async (
      options?: { json?: boolean }
    ): Promise<Record<string, string>> => {
      const headers: Record<string, string> = {};

      // If token is already cached, use it
      if (tokenRef.current) {
        headers["Authorization"] = `Bearer ${tokenRef.current}`;
      } else {
        // Fallback: try to fetch fresh token (e.g. after page reload)
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            tokenRef.current = session.access_token;
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        } catch {
          /* ignore — cookie auth will be used as fallback */
        }
      }

      if (options?.json) {
        headers["Content-Type"] = "application/json";
      }

      return headers;
    },
    []
  );

  return { getHeaders, isLoading, token: tokenRef.current };
}
