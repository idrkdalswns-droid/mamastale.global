"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ImageSorterProps {
  images: string[];
  imageOrder: number[];
  onOrderChange: (order: number[]) => void;
  onComplete: () => void;
  accent: string;
  storyTitle?: string;
}

export function ImageSorter({ images, imageOrder, onOrderChange, onComplete, accent, storyTitle }: ImageSorterProps) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  function handleTap(position: number) {
    if (selectedPosition === null) {
      // 첫 번째 선택
      setSelectedPosition(position);
    } else if (selectedPosition === position) {
      // 같은 카드 재탭 → 선택 해제
      setSelectedPosition(null);
    } else {
      // 두 번째 선택 → swap
      const newOrder = [...imageOrder];
      [newOrder[selectedPosition], newOrder[position]] = [newOrder[position], newOrder[selectedPosition]];
      onOrderChange(newOrder);
      setSelectedPosition(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-6 pt-4 pb-3"
      >
        <h2 className="font-serif text-lg font-bold text-brown">
          이미지 순서를 정해주세요
        </h2>
        <p className="text-[12px] text-brown-light font-light mt-1">
          두 장을 탭하면 순서가 바뀌어요
        </p>
      </motion.div>

      {/* 2-column grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          {imageOrder.map((idx, position) => (
            <motion.button
              key={idx}
              layout
              layoutId={`sort-${idx}`}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={() => handleTap(position)}
              className="relative rounded-xl overflow-hidden focus:outline-none"
              style={{ aspectRatio: "3/4" }}
            >
              {/* Image */}
              <Image
                src={images[idx]}
                alt={`${storyTitle ?? ""} 장면 ${position + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 430px) 50vw, 200px"
                draggable={false}
              />

              {/* 번호 배지 */}
              <div
                className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                style={{ background: accent }}
              >
                {position + 1}
              </div>

              {/* 선택 상태: ring + pulse */}
              {selectedPosition === position && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 3px ${accent}` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: [1, 1.02, 1] }}
                  transition={{ scale: { duration: 0.3 } }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 선택 안내 */}
      <div className="h-6 flex items-center justify-center">
        {selectedPosition !== null && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[12px] font-medium"
            style={{ color: accent }}
          >
            바꿀 카드를 탭하세요
          </motion.p>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] pt-2">
        <button
          onClick={onComplete}
          className="w-full py-3.5 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
            boxShadow: `0 8px 24px ${accent}35`,
          }}
        >
          순서 완료 — 이야기 쓰기
        </button>
      </div>
    </div>
  );
}
