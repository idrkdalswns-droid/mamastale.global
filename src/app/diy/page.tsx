"use client";

import { motion } from "framer-motion";
import { StoryGallery3D } from "@/components/diy/StoryGallery3D";
import Link from "next/link";

export default function DIYPage() {
  return (
    <div className="min-h-dvh bg-cream pb-[calc(env(safe-area-inset-bottom,8px)+20px)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pt-6 pb-5 px-6"
      >
        <h1 className="font-serif text-xl font-bold text-brown tracking-tight">
          DIY 동화 만들기
        </h1>
        <p className="text-[13px] text-brown-light font-light mt-1.5 leading-relaxed">
          일러스트를 골라 순서를 정하고, 아이와 함께 이야기를 써보세요
        </p>
        <div
          className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-medium"
          style={{
            background: "rgba(127,191,176,0.15)",
            color: "#5A9E94",
          }}
        >
          무료 서비스
        </div>
      </motion.div>

      {/* Story gallery */}
      <StoryGallery3D />

      {/* Footer link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center mt-8 px-6"
      >
        <p className="text-[11px] text-brown-pale font-light leading-relaxed">
          AI가 만드는 맞춤 동화를 원하시나요?
        </p>
        <Link
          href="/"
          className="inline-block mt-1.5 text-[12px] font-medium no-underline transition-all"
          style={{ color: "#E07A5F" }}
        >
          맞춤 동화 만들기 →
        </Link>
      </motion.div>
    </div>
  );
}
