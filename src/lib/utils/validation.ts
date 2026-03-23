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
  // H-4: NFD→NFC 재합성으로 혼합 자모 우회 방지 (예: "시ㅂ발")
  const normalized = text
    .normalize("NFD")  // 완전 분해
    .normalize("NFC")  // 재합성 (합성 가능한 자모 조합이 합성됨)
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, "") // zero-width & invisible chars
    .replace(/[\s\.\,\!\?\-\_\*\#\@\/\\~`'"(){}[\]:;<>|+=%^&]/g, "")
    .toLowerCase();
  return PROFANITY_LIST.some((word) => normalized.includes(word));
}

// ─── Community topic allowlist (shared across story routes) ───
// Sprint 2-A: Child-centric keyword overhaul (was: 산후우울, 양육번아웃, 시댁갈등, 경력단절, 자존감)
export const VALID_TOPICS = ["자존감", "성장", "감정표현", "분노조절", "우울극복", "용기", "친구관계", "가족사랑"] as const;

// ─── Client IP extraction (Cloudflare → forwarded → fallback) ───
export function getClientIP(request: Request): string {
  const headers = request.headers;
  const raw = (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
  // R2-5: Cap length to prevent memory abuse from spoofed headers (IPv6 max ~45 chars)
  return raw.slice(0, 45);
}

// ─── Cover image URL validation (static + AI-generated) ───
export function isValidCoverImage(url: string): boolean {
  // 기존 정적 이미지 패턴
  if (/^\/images\/covers\/cover_(pink|green|blue)\d{2}\.(png|jpeg)$/.test(url)) return true;
  if (/^\/images\/covers\/[A-Za-z0-9_]+\.(png|jpeg)$/.test(url)) return true;
  if (/^\/images\/diy\/[a-z0-9-]+\/[A-Za-z0-9_]+\.(jpeg|png)$/.test(url)) return true;
  // AI 생성 — Supabase URL 엄격 검증 (SSRF 방지)
  const host = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace("https://", "");
  if (!host) return false;
  const pattern = new RegExp(
    `^https://${host.replace(/\./g, "\\.")}/storage/v1/object/public/illustrations/covers/[0-9a-f-]+\\.(png|jpeg|jpg)$`,
  );
  return pattern.test(url);
}
