"use client";

import React from "react";

export interface SpreadNavigationProps {
  currentPage: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function SpreadNavigation({
  currentPage,
  totalPages,
  onSelectPage,
  onNext,
  onPrev,
}: SpreadNavigationProps) {
  return (
    <>
      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={currentPage === 0}
          className="px-4 py-2 rounded-full text-xs font-medium text-brown-light
                     border border-brown-pale/30 disabled:opacity-30
                     active:scale-[0.97] transition-all"
        >
          ← 이전
        </button>
        <span className="text-xs text-brown-pale">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={currentPage === totalPages - 1}
          className="px-4 py-2 rounded-full text-xs font-medium text-white
                     disabled:opacity-30 active:scale-[0.97] transition-all"
          style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
        >
          다음 →
        </button>
      </div>

      {/* 페이지 썸네일 */}
      <div className="flex gap-1.5 justify-center py-1">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onSelectPage(i)}
            className={`w-8 h-8 rounded-lg text-[10px] font-medium transition-all ${
              i === currentPage
                ? "bg-coral text-white scale-110"
                : "bg-paper/60 text-brown-light"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </>
  );
}
