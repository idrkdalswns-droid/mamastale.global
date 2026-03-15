"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ImageSorterProps {
  images: string[];
  imageOrder: number[];
  onOrderChange: (order: number[]) => void;
  onComplete: () => void;
  accent: string;
  storyTitle?: string;
  onDeleteImage?: (imageIndex: number) => void;
  onRestoreImage?: (imageIndex: number) => void;
  minImages?: number;
}

export function ImageSorter({
  images,
  imageOrder,
  onOrderChange,
  onComplete,
  accent,
  storyTitle,
  onDeleteImage,
  onRestoreImage,
  minImages = 3,
}: ImageSorterProps) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Derive deleted images from imageOrder vs full set
  const deletedImages = useMemo(
    () =>
      Array.from({ length: images.length }, (_, i) => i).filter(
        (i) => !imageOrder.includes(i)
      ),
    [images.length, imageOrder]
  );

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
        <div className="grid grid-cols-3 gap-2">
          {imageOrder.map((idx, position) => (
            <motion.div
              key={idx}
              layout
              layoutId={`sort-${idx}`}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={() => handleTap(position)}
              role="button"
              tabIndex={0}
              className="relative rounded-xl overflow-hidden focus:outline-none cursor-pointer"
              style={{ aspectRatio: "3/4" }}
            >
              {/* Image */}
              <Image
                src={images[idx]}
                alt={`${storyTitle ?? ""} 장면 ${position + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 430px) 33vw, 140px"
                draggable={false}
              />

              {/* 번호 배지 */}
              <div
                className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                style={{ background: accent }}
              >
                {position + 1}
              </div>

              {/* 삭제 버튼 (× ) — 최소 이미지 수 이상일 때만 표시 */}
              {onDeleteImage && imageOrder.length > minImages && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPosition(null);
                    onDeleteImage(idx);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white text-[11px] font-bold active:bg-black/60 transition-colors"
                  aria-label="이미지 제거"
                >
                  ×
                </button>
              )}

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
            </motion.div>
          ))}
        </div>

        {/* 삭제된 이미지 복원 UI */}
        {deletedImages.length > 0 && onRestoreImage && (
          <div className="mt-4 pt-3 border-t border-black/[0.06]">
            <p className="text-[11px] text-brown-light font-light mb-2">
              제거된 이미지 ({deletedImages.length}장) — 탭하여 복원
            </p>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {deletedImages.map((idx) => (
                <button
                  key={`del-${idx}`}
                  onClick={() => onRestoreImage(idx)}
                  className="shrink-0 relative rounded-lg overflow-hidden opacity-50 hover:opacity-80 active:opacity-90 transition-opacity"
                  style={{ width: 48, height: 64 }}
                >
                  <Image
                    src={images[idx]}
                    alt={`제거됨`}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="text-white text-sm font-bold">+</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
