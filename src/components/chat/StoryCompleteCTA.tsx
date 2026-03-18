"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { incrementStoryCount } from "@/components/ui/PWAInstallBanner";
import { hapticSuccess } from "@/lib/utils/haptic";
import { nameWithParticle } from "@/lib/utils/korean";

interface StoryCompleteCTAProps {
  onViewStory: () => void;
  /** Completed story ID for community share URL */
  storyId?: string;
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

// CSS Confetti pieces (40 colored pieces falling with rotation)
const CONFETTI_COLORS = ["#E07A5F", "#7FBFB0", "#8B6AAF", "#C4956A", "#FEE500", "#B8D8D0", "#C8B8D8"];
const confettiPieces = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${Math.random() * 100}%`,
  delay: Math.random() * 0.8,
  duration: 1.5 + Math.random() * 1.5,
  size: 6 + Math.random() * 6,
  rotation: Math.random() * 360,
  drift: (Math.random() - 0.5) * 100,
}));

export default function StoryCompleteCTA({
  onViewStory,
  storyId,
}: StoryCompleteCTAProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  // Read child name for personalized celebration
  const childName = (() => {
    try { return localStorage.getItem("mamastale_child_name") || ""; } catch { return ""; }
  })();

  // Sprint 4-B: Increment story count for PWA install prompt trigger
  useEffect(() => {
    incrementStoryCount();
    hapticSuccess();
    // Hide confetti after animation completes
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="동화 완성"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === "Escape") onViewStory(); }}
      style={{ background: "rgb(var(--cream) / 0.88)", backdropFilter: "blur(14px)" }}
    >
      {/* Confetti burst */}
      {showConfetti && confettiPieces.map((c) => (
        <motion.div
          key={`confetti-${c.id}`}
          initial={{ opacity: 1, y: -20, x: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            y: [-20, 400 + Math.random() * 200],
            x: [0, c.drift],
            rotate: [0, c.rotation + 360],
            scale: [1, 0.6],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            ease: "easeIn",
          }}
          className="absolute top-0 pointer-events-none rounded-sm"
          style={{
            left: c.left,
            width: c.size,
            height: c.size * 0.6,
            background: c.color,
          }}
          aria-hidden="true"
        />
      ))}

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
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 1.3, 1], rotate: [-30, 10, 0] }}
            transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 180, damping: 12 }}
            className="relative w-14 h-14 mx-auto"
          >
            <Image src="/images/teacher/state/done.jpeg" alt="완성" fill
              className="object-cover rounded-2xl" sizes="56px" />
          </motion.div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, type: "spring", stiffness: 120 }}
          className="font-serif text-2xl font-bold text-brown mb-2 leading-tight"
        >
          축하합니다!<br />
          {childName
            ? <>{nameWithParticle(childName, "이를", "를")} 위한 세상에 단 하나뿐인 동화가 완성되었어요</>
            : <>세상에 단 하나뿐인 동화가 완성되었어요</>
          }
        </motion.h2>

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
          onClick={async () => {
            const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
            const shareData = {
              title: childName
                ? `${nameWithParticle(childName, "이를", "를")} 위해 만든 특별한 동화`
                : "나만의 마음 동화가 완성되었어요",
              text: childName
                ? `${nameWithParticle(childName, "이를", "를")} 위해 만든 특별한 동화 — 마마스테일`
                : "엄마의 이야기로 세상에 하나뿐인 동화를 만들었어요",
              url: storyId ? `${siteUrl}/community/${storyId}` : siteUrl,
            };
            if (navigator.share) {
              navigator.share(shareData).catch(() => {});
            } else {
              try {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
              } catch { /* ignore */ }
            }
          }}
          aria-label="친구에게 공유하기"
          className="w-full py-3 rounded-full text-[13px] font-medium text-brown-mid transition-all active:scale-[0.97]"
          style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
        >
          친구에게 공유하기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
