import { useRef, useCallback } from "react";

// ─── Swipe detection constants ───
const SWIPE_THRESHOLD = 40;        // px — minimum distance for normal swipe
const FLICK_THRESHOLD = 30;        // px — reduced threshold for fast flicks
const FLICK_MAX_DURATION = 200;    // ms — max touch duration to count as flick

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold }: UseSwipeOptions) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const duration = Date.now() - touchStart.current.time;
      touchStart.current = null;

      // Use flick threshold for fast gestures, normal threshold otherwise
      const isFlick = duration <= FLICK_MAX_DURATION;
      const activeThreshold = threshold ?? (isFlick ? FLICK_THRESHOLD : SWIPE_THRESHOLD);

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(dx) < activeThreshold || Math.abs(dy) > Math.abs(dx)) return;

      e.preventDefault(); // 브라우저 뒤로가기 제스처 방지
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
