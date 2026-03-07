/**
 * Persistent anonymous ID for presence tracking and interest clicks.
 * Stored in localStorage so the same user keeps one identity across sessions.
 */
export function getAnonymousId(): string {
  const KEY = "mamastale_anonymous_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // SSR or localStorage unavailable — generate ephemeral ID
    return crypto.randomUUID();
  }
}
