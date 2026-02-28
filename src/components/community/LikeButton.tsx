"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LikeButtonProps {
  storyId: string;
  initialCount: number;
}

export function LikeButton({ storyId, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/community/${storyId}/like`)
      .then((res) => res.json())
      .then((data) => setLiked(data.liked))
      .catch(() => {});
  }, [storyId]);

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/community/${storyId}/like`, { method: "POST" });

      if (res.status === 401) {
        alert("좋아요를 누르려면 로그인이 필요합니다.");
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      setLiked(data.liked);
      setCount((c) => (data.liked ? c + 1 : Math.max(0, c - 1)));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
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
        >
          {liked ? "❤️" : "🤍"}
        </motion.span>
      </AnimatePresence>
      <span>{count}</span>
    </button>
  );
}
