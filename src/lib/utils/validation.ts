/**
 * Shared validation & sanitization utilities.
 * Centralized to ensure consistent security across all routes.
 */

// ─── UUID validation ───
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ─── Text sanitization ───
/** Encode HTML entities and strip dangerous protocols (for user-facing fields like titles, aliases) */
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/**
 * Lightweight sanitizer for AI-generated scene text.
 * Strips dangerous protocols and HTML tags but does NOT encode entities,
 * because React JSX already auto-escapes HTML on render.
 * Encoding entities here would cause double-encoding (&amp;amp;) in the DB.
 */
export function sanitizeSceneText(input: string): string {
  return input
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// ─── Korean profanity filter ───
const PROFANITY_LIST = [
  "시발", "씨발", "씨벌", "ㅅㅂ", "ㅆㅂ",
  "병신", "ㅂㅅ", "지랄", "ㅈㄹ",
  "닥쳐", "꺼져", "새끼", "개새끼",
  "좆", "ㅈ같", "존나", "ㅈㄴ",
  "씹", "개같은", "미친년", "미친놈",
  "ㅄ", "ㅗ", "꼴값",
];

/**
 * Check if text contains Korean profanity.
 * UK-1: NFC normalize + strip zero-width chars to prevent Unicode bypass.
 * Strips whitespace AND special characters to prevent bypass via "시.발", "병_신" etc.
 */
export function containsProfanity(text: string): boolean {
  const normalized = text
    .normalize("NFC")
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, "") // zero-width & invisible chars
    .replace(/[\s\.\,\!\?\-\_\*\#\@\/\\~`'"(){}[\]:;<>|+=%^&]/g, "")
    .toLowerCase();
  return PROFANITY_LIST.some((word) => normalized.includes(word));
}

// ─── Client IP extraction (Cloudflare → forwarded → fallback) ───
export function getClientIP(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
