/**
 * Search query sanitization for Supabase ilike filters.
 * Extracted from /api/community route for testability.
 */

/**
 * Escape Postgres LIKE wildcards (%, _, \) and PostgREST filter syntax
 * characters (commas, dots, parentheses) in user-provided search terms.
 * Returns empty string if input is empty or exceeds maxLength.
 *
 * CTO-FIX: Also escape commas/dots/parens to prevent PostgREST .or() injection.
 * Without this, a search like "a),title.eq.1" could inject arbitrary filter conditions.
 */
export function sanitizeSearchQuery(input: string, maxLength = 100): string {
  if (!input || input.length > maxLength) return "";
  return input
    .replace(/[%_\\]/g, (c) => `\\${c}`)
    // R2: Strip PostgREST filter meta-characters to prevent injection (including : and =)
    .replace(/[.,():=]/g, "")
    .trim();
}

/**
 * Build Supabase .or() filter string for title + author search.
 * Returns null if sanitized query is empty (caller should skip filter).
 */
export function buildSearchFilter(rawSearch: string): string | null {
  const safe = sanitizeSearchQuery(rawSearch);
  if (!safe) return null;
  return `title.ilike.%${safe}%,author_alias.ilike.%${safe}%`;
}

/**
 * Parse & validate pagination params.
 * Returns a safe { page, limit, offset } object.
 */
export function parsePagination(
  rawPage: string | null,
  maxPage = 100,
  perPage = 12
): { page: number; limit: number; offset: number } {
  const parsed = parseInt(rawPage || "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maxPage) : 1;
  const offset = (page - 1) * perPage;
  // Safety cap: prevent excessively large offsets that could DoS the database
  const safeOffset = Math.min(offset, 10_000);
  return { page, limit: perPage, offset: safeOffset };
}
