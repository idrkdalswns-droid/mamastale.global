"use client";

import { motion } from "framer-motion";
import { T } from "@/lib/constants/design-tokens";

interface StoryCompleteCTAProps {
  storyId: string;
  onViewStory: () => void;
}

export default function StoryCompleteCTA({
  storyId,
  onViewStory,
}: StoryCompleteCTAProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed bottom-[76px] left-0 right-0 z-[60]"
    >
      <div className="max-w-[430px] mx-auto px-3.5">
        <button
          onClick={onViewStory}
          className="w-full py-4 rounded-2xl border-none text-sm font-medium cursor-pointer text-white"
        style={{
          background: `linear-gradient(135deg, ${T.coral}, #D4836B)`,
          boxShadow: "0 6px 24px rgba(224,122,95,0.35)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
          동화가 완성되었어요 &mdash; 보러가기
        </button>
      </div>
    </motion.div>
  );
}
