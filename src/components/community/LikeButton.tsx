"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LikeButtonProps {
  storyId: string;
  initialCount: number;
}

const GUEST_LIKES_KEY = "mamastale_guest_likes";

function getGuestLikes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_LIKES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveGuestLike(storyId: string) {
  try {
    const likes = getGuestLikes();
    if (!likes.includes(storyId)) {
      likes.push(storyId);
      localStorage.setItem(GUEST_LIKES_KEY, JSON.stringify(likes));
    }
  } catch {}
}

export function LikeButton({ storyId, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check guest likes first (localStorage)
    const guestLikes = getGuestLikes();
    if (guestLikes.includes(storyId)) {
      setLiked(true);
      setIsGuest(true);
      return;
    }

    // Check authenticated like status
    const controller = new AbortController();
    fetch(`/api/community/${storyId}/like`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setLiked(data.liked);
        if (data.guest) setIsGuest(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [storyId]);

  const toggleLike = useCallback(async () => {
    if (loading) return;
    if (liked && isGuest) return; // Guest cannot unlike

    setLoading(true);
    try {
      const res = await fetch(`/api/community/${storyId}/like`, { method: "POST" });
      if (!res.ok) {
        // 429 = rate limited, other errors silently ignored
        return;
      }

      const data = await res.json();

      if (data.guest) {
        // Guest like — save to localStorage
        saveGuestLike(storyId);
        setLiked(true);
        setIsGuest(true);
        setCount((c) => c + 1);
      } else {
        // Authenticated toggle
        setLiked(data.liked);
        setCount((c) => (data.liked ? c + 1 : Math.max(0, c - 1)));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [loading, liked, isGuest, storyId]);

  return (
    <button
      onClick={toggleLike}
      disabled={loading || (liked && isGuest)}
      aria-pressed={liked}
      aria-label={`공감 ${count}개${liked ? ", 이미 공감함" : ""}`}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.95]"
      style={{
        background: liked ? "rgba(224,122,95,0.1)" : "rgba(255,255,255,0.6)",
        border: liked ? "1.5px solid rgba(224,122,95,0.3)" : "1.5px solid rgba(196,149,106,0.15)",
        color: liked ? "#E07A5F" : "#8B6F55",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={liked ? "liked" : "not-liked"}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.5 }}
          transition={{ duration: 0.2 }}
          className="text-base"
        >
          {liked ? "\u2665" : "\u2661"}
        </motion.span>
      </AnimatePresence>
      <span>{count}</span>
    </button>
  );
}
