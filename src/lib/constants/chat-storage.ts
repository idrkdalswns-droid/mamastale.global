/**
 * Chat storage key constants — shared by useChat store and draft-info utility.
 * Single source of truth to prevent key mismatch.
 */

// AUTH: auto-consumed after login/signup redirect (destructive restore)
export const CHAT_STORAGE_KEY = "mamastale_chat_state";
// DRAFT: persistent manual save — NEVER deleted except by explicit user action or story completion
export const CHAT_DRAFT_KEY = "mamastale_chat_draft";
