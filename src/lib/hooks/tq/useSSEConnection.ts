"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTQStore } from "./useTQStore";
import type { Scene } from "@/lib/types/story";

type SSEMode = "sse" | "polling";

/** Detect in-app browsers (KakaoTalk, Naver, etc.) that break SSE */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /kakaotalk|naver|line|instagram|fbav|fban/.test(ua);
}

interface SSECallbacks {
  onScene?: (scene: Scene, index: number) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (storyId: string) => void;
  onError?: (message: string) => void;
}

/**
 * SSE connection for TQ story generation with polling fallback.
 * - In-app browsers → polling mode immediately
 * - Normal browsers → SSE, with auto-fallback to polling on failure
 * - Once polling, stays polling for the session
 */
export function useSSEConnection(
  sessionId: string | null,
  enabled: boolean,
  callbacks: SSECallbacks,
) {
  const [mode, setMode] = useState<SSEMode>(
    isInAppBrowser() ? "polling" : "sse",
  );
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retriesRef = useRef(0);
  const { addScene, setGenerationProgress, setStoryId, setStatus } = useTQStore();

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (!sessionId || pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/tq/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.session?.status === "completed" && data.session?.story_id) {
          cleanup();
          setStoryId(data.session.story_id);
          setStatus("completed");
          callbacks.onComplete?.(data.session.story_id);
        } else if (data.session?.status === "failed") {
          cleanup();
          setStatus("failed");
          callbacks.onError?.("동화 생성��� 실패했어요.");
        }

        // Update progress from scenes count if available
        if (data.scenes_count !== undefined) {
          setGenerationProgress(data.scenes_count);
          callbacks.onProgress?.(data.scenes_count, 9);
        }
      } catch { /* retry next interval */ }
    }, 5000);
  }, [sessionId, cleanup, setStoryId, setStatus, setGenerationProgress, callbacks]);

  // SSE connection
  const startSSE = useCallback(() => {
    if (!sessionId) return;

    const url = `/api/tq/generate?session_id=${sessionId}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("scene", (e) => {
      try {
        const scene = JSON.parse(e.data) as Scene & { index?: number };
        const idx = scene.index ?? 0;
        addScene(scene);
        callbacks.onScene?.(scene, idx);
      } catch { /* malformed scene data */ }
    });

    es.addEventListener("progress", (e) => {
      try {
        const { current, total } = JSON.parse(e.data);
        setGenerationProgress(current);
        callbacks.onProgress?.(current, total);
      } catch { /* ignore */ }
    });

    es.addEventListener("done", (e) => {
      try {
        const { story_id } = JSON.parse(e.data);
        cleanup();
        setStoryId(story_id);
        setStatus("completed");
        callbacks.onComplete?.(story_id);
      } catch { /* ignore */ }
    });

    es.addEventListener("error", (e) => {
      if (e instanceof MessageEvent && e.data) {
        try {
          const { message } = JSON.parse(e.data);
          cleanup();
          setStatus("failed");
          callbacks.onError?.(message || "동화 생성에 실패했어요.");
          return;
        } catch { /* not a server error event */ }
      }

      // Connection error → retry with backoff, then fall back to polling
      retriesRef.current += 1;
      if (retriesRef.current > 3) {
        cleanup();
        setMode("polling");
        startPolling();
        return;
      }
      // Exponential backoff: 5s, 10s, 20s
      const delay = 5000 * Math.pow(2, retriesRef.current - 1);
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          cleanup();
          startSSE();
        }
      }, delay);
    });

    es.onopen = () => {
      retriesRef.current = 0;
    };
  }, [sessionId, cleanup, addScene, setGenerationProgress, setStoryId, setStatus, startPolling, callbacks]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    if (mode === "polling") {
      startPolling();
    } else {
      startSSE();
    }

    // 60s no-response timeout → switch to polling
    const timeout = setTimeout(() => {
      if (eventSourceRef.current) {
        cleanup();
        setMode("polling");
        startPolling();
      }
    }, 60000);

    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }, [enabled, sessionId, mode, startSSE, startPolling, cleanup]);

  return { mode, cleanup };
}
