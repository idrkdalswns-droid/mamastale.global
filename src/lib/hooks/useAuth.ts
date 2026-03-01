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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user as AuthUser | null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user?: AuthUser } | null) => {
        setUser((session?.user as AuthUser) ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // IN-9: Await signOut to ensure cookies are cleared before navigating
  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      setUser(null); // Optimistic UI update
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
