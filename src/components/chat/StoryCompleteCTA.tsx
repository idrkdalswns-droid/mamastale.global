"use client";

import { motion } from "framer-motion";

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-6"
      style={{ background: "rgba(253,249,244,0.85)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-sm text-center"
      >
        <div className="text-[64px] mb-5">✨</div>
        <h2 className="font-serif text-2xl font-bold text-brown mb-3 leading-tight">
          나의 동화가<br />완성되었어요
        </h2>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-8 break-keep">
          세상에 하나뿐인 치유 동화를<br />
          지금 바로 확인해 보세요
        </p>
        <button
          onClick={onViewStory}
          className="w-full py-4 rounded-full text-white text-base font-medium transition-transform active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #D4836B)",
            boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
          }}
        >
          내 동화 보러가기
        </button>
      </motion.div>
    </motion.div>
  );
}
