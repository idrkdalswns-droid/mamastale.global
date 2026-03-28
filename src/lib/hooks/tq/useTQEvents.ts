"use client";

import { useCallback, useRef } from "react";
import { useAuthToken } from "@/lib/hooks/useAuthToken";

type TQEventType =
  | "session_start"
  | "question_shown"
  | "question_answered"
  | "phase_transition"
  | "q20_shown"
  | "q20_submitted"
  | "generation_start"
  | "generation_complete"
  | "generation_failed"
  | "session_abandoned"
  | "fallback_story_used";

/**
 * Fire-and-forget event tracking for TQ sessions.
 * Uses navigator.sendBeacon (preferred) → fetch keepalive fallback.
 */
export function useTQEvents() {
  const { getHeaders } = useAuthToken();
  const pendingRef = useRef(false);

  const track = useCallback(
    async (
      sessionId: string,
      eventType: TQEventType,
      metadata?: Record<string, unknown>,
    ) => {
      if (pendingRef.current) return; // debounce rapid fires
      pendingRef.current = true;
      setTimeout(() => { pendingRef.current = false; }, 100);

      const payload = JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        metadata: metadata || {},
        client_ts: Date.now(),
      });

      // Try sendBeacon first (works during unload)
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const sent = navigator.sendBeacon(
          "/api/tq/event",
          new Blob([payload], { type: "application/json" }),
        );
        if (sent) return;
      }

      // Fallback: fetch with keepalive
      try {
        const headers = await getHeaders({ json: true });
        fetch("/api/tq/event", {
          method: "POST",
          headers,
          body: payload,
          keepalive: true,
        }).catch(() => {}); // fire-and-forget
      } catch { /* ignore */ }
    },
    [getHeaders],
  );

  return { track };
}
