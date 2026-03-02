import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "[Supabase] Client initialization failed — missing env vars:",
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : "",
      !key ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""
    );
    return null;
  }

  if (!_client) {
    _client = createBrowserClient(url, key, {
      auth: {
        flowType: "pkce",
      },
    });
  }

  return _client;
}
