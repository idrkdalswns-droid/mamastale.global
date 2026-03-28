/**
 * Single Point of Truth for blind status calculation.
 * Used by all API endpoints that serve story data.
 */
export function calculateBlindStatus(
  story: { blind_until: string | null },
  profile: { has_ever_purchased: boolean }
): boolean {
  if (!story.blind_until) return false;
  if (profile.has_ever_purchased) return false;
  return new Date() > new Date(story.blind_until);
}

/**
 * Filter scenes for blinded stories.
 * Shows first 6 scenes, strips text from remaining.
 */
export function applyBlindFilter<T extends { text: string }>(
  scenes: T[],
  isBlinded: boolean
): T[] {
  if (!isBlinded) return scenes;
  return scenes.map((scene, i) =>
    i < 6 ? scene : { ...scene, text: "" }
  );
}

// ── Blind config cache (1-hour, per Edge isolate) ──
interface BlindConfig {
  enabled: boolean;
  days: number;
}

let cachedConfig: BlindConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getBlindConfig(
  supabase: { rpc: (fn: string) => Promise<{ data: BlindConfig | null; error: unknown }> }
): Promise<BlindConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const { data } = await supabase.rpc("get_blind_config");
    if (data) {
      cachedConfig = data as BlindConfig;
      cacheTimestamp = now;
      return cachedConfig;
    }
  } catch {
    // fallback to default
  }

  return { enabled: false, days: 3 };
}
