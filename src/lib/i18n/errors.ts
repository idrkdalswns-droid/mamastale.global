/**
 * Server-side error message resolver (Edge Runtime compatible).
 *
 * Uses static JSON import — bundled at build time, no runtime file I/O.
 * Compatible with future next-intl migration: same JSON structure,
 * same {variable} interpolation syntax, same dot-notation keys.
 *
 * API routes only — for client-side components, use tc() from "@/lib/i18n/client".
 */
import { koMessages, resolve, interpolate } from "./resolve";

// ─── Auto-extracted key types from ko.json structure ───
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: NestedKeyOf<
        T[K],
        `${Prefix}${Prefix extends "" ? "" : "."}${K}`
      >;
    }[keyof T & string]
  : Prefix;

/** Server-only: restricted to Errors.* keys — prevents accidental UI.* usage in APIs */
export type ErrorKey = NestedKeyOf<typeof koMessages["Errors"], "Errors">;

/** Full key space: Errors.* + UI.* — used by client tc() */
export type MessageKey = NestedKeyOf<typeof koMessages>;

type ErrorParams = Record<string, string | number>;

/**
 * Resolve an error message by key, with optional parameter interpolation.
 * Server/API routes only — accepts ErrorKey (Errors.* namespace).
 *
 * @example
 * t("Errors.auth.loginRequired")
 * // → "로그인이 필요합니다."
 *
 * t("Errors.teacher.sceneProfanity", { sceneNumber: 3 })
 * // → "장면 3에 부적절한 표현이 포함되어 있습니다."
 */
export function t(key: ErrorKey, params?: ErrorParams): string {
  return interpolate(resolve(key), params);
}
