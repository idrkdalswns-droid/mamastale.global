/**
 * Server-side error message resolver (Edge Runtime compatible).
 *
 * Uses static JSON import — bundled at build time, no runtime file I/O.
 * Compatible with future next-intl migration: same JSON structure,
 * same {variable} interpolation syntax, same dot-notation keys.
 *
 * API routes only — do NOT inject return values into DOM directly.
 */
import koMessages from "@messages/ko.json";

// ─── Auto-extracted ErrorKey type from ko.json structure ───
// No manual union maintenance needed — add a key to ko.json and it's typed automatically.
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: NestedKeyOf<
        T[K],
        `${Prefix}${Prefix extends "" ? "" : "."}${K}`
      >;
    }[keyof T & string]
  : Prefix;

export type ErrorKey = NestedKeyOf<typeof koMessages["Errors"], "Errors">;

type ErrorParams = Record<string, string | number>;

const FALLBACK_MESSAGE = "일시적인 오류가 발생했습니다.";

function resolve(key: string): string {
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

/**
 * Resolve an error message by key, with optional parameter interpolation.
 *
 * @example
 * t("Errors.auth.loginRequired")
 * // → "로그인이 필요합니다."
 *
 * t("Errors.teacher.sceneProfanity", { sceneNumber: 3 })
 * // → "장면 3에 부적절한 표현이 포함되어 있습니다."
 */
export function t(key: ErrorKey, params?: ErrorParams): string {
  let message = resolve(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{${k}}`, String(v));
    }
  }
  return message;
}
