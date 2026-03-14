"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Reorder, motion, AnimatePresence } from "framer-motion";

interface ImageSorterProps {
  images: string[];
  imageOrder: number[];
  onOrderChange: (order: number[]) => void;
  onComplete: () => void;
  accent: string;
  storyTitle?: string;
}

export function ImageSorter({ images, imageOrder, onOrderChange, onComplete, accent, storyTitle }: ImageSorterProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleReorder = useCallback(
    (newOrder: number[]) => {
      onOrderChange(newOrder);
    },
    [onOrderChange],
  );

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
          카드를 길게 누른 채 위아래로 드래그하세요
        </p>
      </motion.div>

      {/* Sortable list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <Reorder.Group
          axis="y"
          values={imageOrder}
          onReorder={handleReorder}
          className="flex flex-col gap-2.5"
        >
          <AnimatePresence>
            {imageOrder.map((idx, position) => (
              <Reorder.Item
                key={idx}
                value={idx}
                onDragStart={() => setDragActive(true)}
                onDragEnd={() => setDragActive(false)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: position * 0.04,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                whileDrag={{
                  scale: 1.03,
                  boxShadow: `0 12px 32px ${accent}30`,
                  zIndex: 50,
                }}
                className="relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
                style={{
                  background: "rgb(var(--paper))",
                  border: `1px solid rgba(var(--brown), 0.08)`,
                }}
              >
                <div className="flex items-center gap-3 p-2">
                  {/* Order number */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: accent }}
                  >
                    {position + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={images[idx]}
                      alt={`${storyTitle ?? ''} 장면 ${position + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      draggable={false}
                    />
                  </div>

                  {/* Drag handle hint */}
                  <div className="flex-1 flex justify-end pr-1">
                    <motion.div
                      className="flex flex-col gap-[3px] opacity-50"
                      animate={position === 0 ? { x: [0, 4, 0] } : undefined}
                      transition={position === 0 ? { repeat: 2, duration: 0.4, delay: 1 } : undefined}
                    >
                      <div className="w-4 h-[2px] bg-brown rounded-full" />
                      <div className="w-4 h-[2px] bg-brown rounded-full" />
                      <div className="w-4 h-[2px] bg-brown rounded-full" />
                    </motion.div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: dragActive ? 0.3 : 1 }}
        className="px-6 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] pt-3"
      >
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
      </motion.div>
    </div>
  );
}
