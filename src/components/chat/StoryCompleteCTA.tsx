"use client";

import { motion } from "framer-motion";

interface StoryCompleteCTAProps {
  onViewStory: () => void;
}

// Soft floating particles for celebration feel
const particles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ["*", "•", "·", "○", "◦", "∘"][i % 6],
  x: Math.random() * 300 - 150,
  y: Math.random() * -200 - 50,
  delay: Math.random() * 0.8,
  duration: 2 + Math.random() * 1.5,
  size: 14 + Math.random() * 12,
}));

export default function StoryCompleteCTA({
  onViewStory,
}: StoryCompleteCTAProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="동화 완성"
      style={{ background: "rgb(var(--cream) / 0.88)", backdropFilter: "blur(14px)" }}
    >
      {/* Celebration particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 60, x: 0, scale: 0.3 }}
          animate={{
            opacity: [0, 0.8, 0.6, 0],
            y: [60, p.y],
            x: [0, p.x],
            scale: [0.3, 1, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: 0.3 + p.delay,
            ease: "easeOut",
          }}
          className="absolute pointer-events-none"
          style={{ fontSize: p.size }}
          aria-hidden="true"
        >
          {p.emoji}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-sm text-center relative z-10"
      >
        {/* Soft glow behind emoji */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="w-28 h-28 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, rgba(224,122,95,0.12) 0%, transparent 70%)",
          }}
        >
          <motion.span
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 200 }}
            className="text-[64px]"
          >
            ·
          </motion.span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="font-serif text-2xl font-bold text-brown mb-2 leading-tight"
        >
          나의 동화가<br />완성되었어요
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-[13px] text-brown-light font-normal leading-relaxed mb-3 break-keep"
        >
          어머니의 이야기가 세상에 하나뿐인<br />
          마음 동화가 되었습니다.<br />
          완성된 동화는 내 서재에 저장되어 있어요.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="text-[11px] text-brown-pale font-normal mb-8"
        >
          오늘의 여정, 정말 수고하셨어요
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.0 }}
          onClick={onViewStory}
          className="w-full py-4 rounded-full text-white text-base font-medium transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
          }}
        >
          내 동화 보러가기
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "나만의 마음 동화가 완성되었어요",
                text: "엄마의 이야기로 세상에 하나뿐인 동화를 만들었어요",
                url: "https://mamastale-global.pages.dev",
              }).catch(() => {});
            }
          }}
          className="w-full py-3 rounded-full text-[13px] font-medium text-brown-mid transition-all active:scale-[0.97]"
          style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
        >
          친구에게 공유하기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
