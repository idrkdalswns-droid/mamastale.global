"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    [key: string]: unknown;
  };
}

/**
 * Route-Hunt 3-1: Clear all mamastale user data from browser storage.
 * Called on signOut and account deletion to prevent PII/therapy data leakage on shared devices.
 * Must be synchronous — called before window.location.href which interrupts JS execution.
 */
export function clearAllUserData() {
  const cleared: string[] = [];
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith("mamastale_") || k.startsWith("mamastale-")) {
      localStorage.removeItem(k);
      cleared.push(k);
    }
  });
  sessionStorage.clear();
  if (cleared.length > 0) {
    console.debug("[Auth] Cleared user data:", cleared);
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // F1 Fix: Timeout fallback — if getUser() hangs (e.g. network issue),
    // force loading=false after 5s so CTA button doesn't stay disabled forever
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 5000);

    // Get initial session
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!resolved) {
          resolved = true;
          setUser(data.user as AuthUser | null);
          setLoading(false);
        }
      } catch {
        if (!resolved) {
          resolved = true;
          setUser(null);
          setLoading(false);
        }
      }
    };
    fetchUser();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user?: AuthUser } | null) => {
        setUser((session?.user as AuthUser) ?? null);
      }
    );

    return () => {
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  // IN-9: Await signOut to ensure cookies are cleared before navigating
  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      setUser(null); // Optimistic UI update
      // Route-Hunt 3-1: Clear all user data from localStorage/sessionStorage
      // before navigation to prevent PII leakage on shared devices
      clearAllUserData();
      try {
        await supabase.auth.signOut();
      } catch {
        // Proceed with navigation even if signOut fails
      }
      window.location.href = "/";
    }
  }, []);

  return { user, loading, signOut };
}
