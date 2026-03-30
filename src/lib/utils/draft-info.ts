/**
 * Lightweight draft detection — reads localStorage directly without Zustand.
 * Use this when you only need to check if a draft exists (e.g., landing page banner).
 *
 * For full draft restore, use useChatStore().restoreDraft() instead.
 */

import { CHAT_STORAGE_KEY, CHAT_DRAFT_KEY } from "@/lib/constants/chat-storage";

export interface DraftInfo {
  phase: number;
  messageCount: number;
  savedAt: number;
  source: "draft" | "auth";
}

/**
 * Check if a chat draft exists in localStorage.
 * Returns metadata about the draft, or null if none exists / expired.
 *
 * Priority: persistent draft (30d) → auth save (24h)
 */
export function getDraftInfo(): DraftInfo | null {
  if (typeof window === "undefined") return null;

  try {
    let raw = localStorage.getItem(CHAT_DRAFT_KEY);
    let source: "draft" | "auth" = "draft";

    // Fallback to auth save
    if (!raw) {
      raw = localStorage.getItem(CHAT_STORAGE_KEY);
      source = "auth";
    }

    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    if (typeof snapshot !== "object" || snapshot === null || typeof snapshot.savedAt !== "number") return null;

    // Expiry: draft 30 days, auth 24 hours
    const maxAge = source === "draft"
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;
    if (Date.now() - snapshot.savedAt > maxAge) {
      localStorage.removeItem(source === "draft" ? CHAT_DRAFT_KEY : CHAT_STORAGE_KEY);
      return null;
    }

    const userMsgCount = Array.isArray(snapshot.messages)
      ? snapshot.messages.filter((m: { role: string }) => m.role === "user").length
      : 0;

    return {
      phase: snapshot.currentPhase || 1,
      messageCount: userMsgCount,
      savedAt: snapshot.savedAt,
      source,
    };
  } catch (e) {
    console.warn("[draft-info] getDraftInfo 실패", e);
    return null;
  }
}
