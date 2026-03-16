"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PushPermissionBanner } from "@/components/ui/PushPermissionBanner";
import { incrementStoryCount } from "@/components/ui/PWAInstallBanner";
import { hapticSuccess } from "@/lib/utils/haptic";
import { nameWithParticle } from "@/lib/utils/korean";

/** V5-FIX #6: Positive topic suggestions (avoid negative framing post-completion) */
const TOPIC_SUGGESTIONS = [
  "나의 꿈", "가족 사랑", "용기와 모험", "소중한 추억", "성장 이야기",
];

interface StoryCompleteCTAProps {
  onViewStory: () => void;
  onNewStory?: () => void;
  /** Completed story ID for community share URL */
  storyId?: string;
  /** Auth token getter for push subscription */
  getHeaders?: (opts?: { json?: boolean }) => Promise<Record<string, string>>;
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
  onNewStory,
  storyId,
  getHeaders,
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
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 1.3, 1], rotate: [-30, 10, 0] }}
            transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 180, damping: 12 }}
            className="text-[56px]"
          >
            📖
          </motion.span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, type: "spring", stiffness: 120 }}
          className="font-serif text-2xl font-bold text-brown mb-2 leading-tight"
        >
          축하합니다!<br />나의 동화가 완성되었어요
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-[13px] text-brown-light font-normal leading-relaxed mb-3 break-keep"
        >
          {childName ? (
            <>
              {nameWithParticle(childName, "이에게", "에게")} 읽어줄 수 있는<br />
              세상에 하나뿐인 동화가 완성됐어요!<br />
              완성된 동화는 내 서재에 저장되어 있어요.
            </>
          ) : (
            <>
              소중한 이야기가 세상에 하나뿐인<br />
              마음 동화가 되었습니다.<br />
              완성된 동화는 내 서재에 저장되어 있어요.
            </>
          )}
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

        {/* Repurchase nudge — next story suggestion */}
        {onNewStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.6 }}
            className="mt-6 pt-5"
            style={{ borderTop: "1px solid rgba(196,149,106,0.12)" }}
          >
            <p className="text-[11px] text-brown-pale font-normal mb-2 break-keep">
              이번엔 어떤 이야기를 들려주실 건가요?
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {TOPIC_SUGGESTIONS.map((topic) => (
                <span
                  key={topic}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                  style={{ background: "rgba(224,122,95,0.08)", color: "#C96B52" }}
                >
                  {topic}
                </span>
              ))}
            </div>
            {/* V5-FIX #26: Coral gradient CTA for better conversion */}
            <button
              onClick={onNewStory}
              className="w-full py-3 rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
              }}
            >
              + 새로운 이야기 시작하기
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Sprint 4-A: Push notification permission banner (shows after 3s delay) */}
      <PushPermissionBanner delay={3000} getHeaders={getHeaders} />
    </motion.div>
  );
}
