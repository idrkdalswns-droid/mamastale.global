"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Empty state for the library page when the user has no completed stories.
 * Visually matches the carousel aesthetic with a cover-card-shaped placeholder.
 */
export default memo(function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center pt-4 pb-8">
      {/* Placeholder card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[260px] rounded-3xl overflow-hidden relative"
        style={{
          aspectRatio: "3/4",
          background:
            "linear-gradient(145deg, rgba(224,122,95,0.08) 0%, rgba(200,184,216,0.06) 50%, rgba(168,191,168,0.08) 100%)",
          border: "2px dashed rgba(196,149,106,0.18)",
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          {/* Book icon */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(224,122,95,0.08)" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="text-coral/40"
              aria-hidden="true"
            >
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="font-serif text-base font-semibold text-brown text-center mb-2"
          >
            아직 동화가 없어요
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-xs text-brown-light font-light text-center leading-relaxed break-keep"
          >
            엄마의 이야기로<br />
            세상에 하나뿐인 동화를 만들어보세요
          </motion.p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="mt-6"
      >
        <Link
          href="/?action=start"
          className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          첫 동화 만들러 가기 →
        </Link>
      </motion.div>
    </div>
  );
});
