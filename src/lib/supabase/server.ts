import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Component context
        }
      },
    },
  });
}

/** Service role client for admin operations (webhooks, etc.) */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // IN-10: Log warning so operators notice missing env var (silent no-ops are dangerous)
    console.warn("[Supabase] Service role client unavailable — SUPABASE_SERVICE_ROLE_KEY not set");
    return null;
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() { return []; },
      setAll() {},
    },
  });
}
