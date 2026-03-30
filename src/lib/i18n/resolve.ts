/**
 * Shared i18n resolution logic — used by both server t() and client tc().
 * Pure functions, no "use client" directive, safe for any runtime.
 */
import koMessages from "@messages/ko.json";

const FALLBACK_MESSAGE = "일시적인 오류가 발생했습니다.";

/** Resolve a dot-notation key to a message string from ko.json */
export function resolve(key: string): string {
  const parts = key.split(".");
  let current: unknown = koMessages;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return FALLBACK_MESSAGE;
    }
  }
  return typeof current === "string" ? current : FALLBACK_MESSAGE;
}

/** Interpolate {variable} placeholders in a message string */
export function interpolate(message: string, params?: Record<string, string | number>): string {
  if (!params) return message;
  let result = message;
  for (const [k, v] of Object.entries(params)) {
    result = result.replaceAll(`{${k}}`, String(v));
  }
  return result;
}

export { koMessages };
