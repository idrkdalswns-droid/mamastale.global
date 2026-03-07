"use client";

import { useEffect, useRef, useState } from "react";
import { getAnonymousId } from "@/lib/utils/anonymous-id";

interface PresenceCounts {
  total: number;
  creating: number;
  isLoaded: boolean;
}

/**
 * Heartbeat hook for real-time presence tracking.
 * Sends POST /api/presence every 30s and returns live counts.
 *
 * @param page - Current page identifier ('home' | 'chat' | 'other')
 */
export function usePresence(page: "home" | "chat" | "other"): PresenceCounts {
  const [counts, setCounts] = useState<PresenceCounts>({
    total: 0,
    creating: 0,
    isLoaded: false,
  });
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let mounted = true;

    const sendHeartbeat = async () => {
      try {
        const anonymousId = getAnonymousId();
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonymous_id: anonymousId,
            page: pageRef.current,
          }),
        });

        if (res.ok && mounted) {
          const data = await res.json();
          setCounts({
            total: data.total ?? 0,
            creating: data.creating ?? 0,
            isLoaded: true,
          });
        }
      } catch {
        // Silently fail — presence is non-critical
      }
    };

    // Initial heartbeat
    sendHeartbeat();

    // Repeat every 30 seconds
    intervalId = setInterval(sendHeartbeat, 30_000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []); // Only on mount/unmount

  return counts;
}
