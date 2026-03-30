"use client";

/**
 * Client-side message resolver.
 * Mirrors server t() but accepts full MessageKey (Errors.* + UI.*).
 * Import directly: import { tc } from "@/lib/i18n/client"
 */
import { resolve, interpolate } from "./resolve";
import type { MessageKey } from "./errors";

export function tc(key: MessageKey, params?: Record<string, string | number>): string {
  return interpolate(resolve(key), params);
}
