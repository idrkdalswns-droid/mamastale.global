"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PopupBookViewer } from "./PopupBookViewer";

interface DIYCompleteProps {
  storyTitle: string;
  images: string[];
  imageOrder: number[];
  texts: Record<number, string>;
  accent: string;
  onReset: () => void;
  onBack: () => void;
}

export function DIYComplete({
  storyTitle,
  images,
  imageOrder,
  texts,
  accent,
  onReset,
  onBack,
}: DIYCompleteProps) {
  const [reviewPage, setReviewPage] = useState(0);
  const [showBook, setShowBook] = useState(false);

  const writtenPages = imageOrder.filter((idx) => texts[idx]?.trim()).length;

  if (showBook) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            onClick={() => setShowBook(false)}
            className="text-[12px] text-brown-light min-h-[44px] flex items-center"
          >
            ← 돌아가기
          </button>
          <h3 className="font-serif text-[14px] font-bold text-brown">
            {storyTitle}
          </h3>
          <div className="w-[44px]" />
        </div>
        <div className="flex-1">
          <PopupBookViewer
            images={images}
            imageOrder={imageOrder}
            texts={texts}
            currentPage={reviewPage}
            onPageChange={setReviewPage}
            accent={accent}
            editable={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-6">
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center"
      >
        {/* Celebration emoji */}
        <motion.div
          className="text-[56px] mb-4"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          {String.fromCodePoint(0x1F4DA)}
        </motion.div>

        <h2 className="font-serif text-xl font-bold text-brown mb-2">
          우리 가족만의 동화가 완성됐어요!
        </h2>
        <p className="text-[13px] text-brown-light font-light leading-relaxed">
          {writtenPages}장의 이야기를 직접 만들었어요
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-xs mt-8 flex flex-col gap-3"
      >
        {/* View book */}
        <button
          onClick={() => {
            setReviewPage(0);
            setShowBook(true);
          }}
          className="w-full py-3.5 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
            boxShadow: `0 8px 24px ${accent}35`,
          }}
        >
          완성된 동화 보기
        </button>

        {/* Edit again */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97]"
          style={{
            color: accent,
            border: `1.5px solid ${accent}30`,
            background: `${accent}08`,
          }}
        >
          다시 편집하기
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="text-[11px] text-brown-pale font-light py-2"
        >
          처음부터 다시 만들기
        </button>

        {/* Back to gallery */}
        <Link
          href="/diy"
          className="text-[11px] text-brown-light font-light py-2 no-underline text-center underline underline-offset-2 decoration-brown-pale/30"
        >
          다른 동화 고르기
        </Link>
      </motion.div>
    </div>
  );
}
