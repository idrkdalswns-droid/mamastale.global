"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface PremiumUpgradeCTAProps {
  /** Where the user came from: "story_complete" or "no_tickets" */
  trigger: "story_complete" | "no_tickets";
  onClose: () => void;
  onViewStory?: () => void;
}

/**
 * Premium upgrade conversion CTA.
 * Shown after:
 * 1. Free trial story completion — encourages upgrade for premium quality
 * 2. Ticket exhaustion — blocks further creation until purchase
 *
 * Key marketing angles:
 * - 2x longer story text (5-7 sentences vs 3-4 per scene)
 * - Premium AI model (Claude Opus) for literary quality
 * - Transparency about AI tier as trust signal
 */
export default function PremiumUpgradeCTA({
  trigger,
  onClose,
  onViewStory,
}: PremiumUpgradeCTAProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 z-[90] flex items-center justify-center px-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="프리미엄 동화 안내"
      style={{ background: "rgb(var(--cream) / 0.92)", backdropFilter: "blur(16px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Card */}
        <div
          className="rounded-3xl p-7 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgb(var(--cream)), rgb(var(--surface)))",
            boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
          }}
        >
          {/* Premium badge glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, rgba(224,122,95,0.15) 0%, transparent 70%)",
            }}
          >
          </motion.div>

          {trigger === "story_complete" ? (
            <>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="font-serif text-xl font-bold text-brown mb-2 leading-tight"
              >
                동화가 잘 완성되었어요!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.55 }}
                className="text-[13px] text-brown-light font-light leading-relaxed mb-5 break-keep"
              >
                이번 동화, 마음에 드셨나요?<br />
                다음 동화는 <span className="text-coral font-semibold">프리미엄 AI</span>로<br />
                더 깊고 풍성하게 만들어 드릴게요.
              </motion.p>
            </>
          ) : (
            <>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="font-serif text-xl font-bold text-brown mb-2 leading-tight"
              >
                더 깊은 이야기를 만들어보세요
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.55 }}
                className="text-[13px] text-brown-light font-light leading-relaxed mb-5 break-keep"
              >
                어머니의 이야기는 아직 더 있잖아요.<br />
                <span className="text-coral font-semibold">프리미엄 동화</span>로 더 깊은 마음을<br />
                아이에게 전해보세요.
              </motion.p>
            </>
          )}

          {/* Comparison: Standard vs Premium */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className="mb-5"
          >
            <div className="grid grid-cols-2 gap-3 text-left">
              {/* Standard tier */}
              <div
                className="rounded-2xl p-3.5"
                style={{ background: "rgba(0,0,0,0.03)" }}
              >
                <p className="text-[10px] text-brown-pale font-medium mb-2 uppercase tracking-wider">기본</p>
                <ul className="space-y-1.5 text-[11px] text-brown-mid font-light leading-snug">
                  <li>· 장면당 3~4문장</li>
                  <li>· 표준 문장 품질</li>
                  <li>· 간단한 삽화 설명</li>
                </ul>
              </div>
              {/* Premium tier */}
              <div
                className="rounded-2xl p-3.5 relative"
                style={{
                  background: "linear-gradient(135deg, rgba(224,122,95,0.08), rgba(224,122,95,0.04))",
                  border: "1.5px solid rgba(224,122,95,0.2)",
                }}
              >
                <div
                  className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
                >
                  PREMIUM
                </div>
                <p className="text-[10px] text-coral font-semibold mb-2 uppercase tracking-wider">유료 결제</p>
                <ul className="space-y-1.5 text-[11px] text-brown font-medium leading-snug">
                  <li>· 장면당 5~7문장</li>
                  <li>· 문학적 표현 품질</li>
                  <li>· 세밀한 장면 묘사</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Trust signal: AI transparency */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="flex items-center justify-center gap-1.5 mb-5 px-4 py-2 rounded-full mx-auto"
            style={{ background: "rgba(90,158,143,0.08)", width: "fit-content" }}
          >
            <p className="text-[10px] text-[#5A9E8F] font-medium">
              프리미엄은 더 높은 수준의 AI 모델로 동화를 만들어요
            </p>
          </motion.div>

          {/* Price & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            <button
              onClick={() => router.push("/pricing")}
              className="w-full py-3.5 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] mb-2"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
              }}
            >
              프리미엄 동화 만들기 — ₩4,900
            </button>
            <p className="text-[10px] text-brown-pale font-light mb-4">
              커피 한 잔 값으로 아이가 매일 읽는 동화를
            </p>

            {/* Bundle upsell with Pennebaker research */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px" style={{ background: "rgba(196,149,106,0.15)" }} />
              <span className="text-[10px] text-brown-pale font-light">또는</span>
              <div className="flex-1 h-px" style={{ background: "rgba(196,149,106,0.15)" }} />
            </div>

            <p className="text-[11px] text-brown-light font-light leading-relaxed mb-3 text-center break-keep">
              매일 15~20분, 4일 연속 마음 이야기를<br />
              꺼낸 사람들의 마음이 가벼워졌다는<br />
              연구 결과가 있어요.
            </p>

            <button
              onClick={() => router.push("/pricing")}
              className="w-full py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97] mb-3"
              style={{
                background: "transparent",
                color: "#6D4C91",
                border: "1.5px solid rgba(109,76,145,0.4)",
              }}
            >
              4편 묶음으로 시작하기 · ₩14,900
              <span className="text-[10px] font-normal ml-1 opacity-70">(24% 할인)</span>
            </button>

            {trigger === "story_complete" && onViewStory ? (
              <button
                onClick={onViewStory}
                className="w-full py-2.5 text-[13px] font-medium text-coral transition-all min-h-[44px]"
              >
                먼저 내 동화 보러가기 →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-2.5 text-[12px] font-light text-brown-pale transition-all min-h-[44px]"
              >
                나중에 할게요
              </button>
            )}
          </motion.div>
        </div>

        {/* Bottom trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="flex items-center justify-center gap-4 mt-4 text-[10px] text-brown-pale font-light"
        >
          <span>대화 100% 비공개</span>
          <span>안전 결제</span>
          <span>환불 불가</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
