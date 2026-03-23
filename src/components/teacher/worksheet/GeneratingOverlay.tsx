"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "동화를 분석하고 있어요...",
  "캐릭터의 감정을 읽고 있어요...",
  "활동지를 만들고 있어요...",
  "거의 다 됐어요!",
];

export function GeneratingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, MESSAGES.length - 1));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 bg-cream/95 flex flex-col items-center justify-center z-10 rounded-2xl">
      {/* Spinner */}
      <div className="w-12 h-12 border-3 border-coral/30 border-t-coral rounded-full animate-spin mb-6" />

      {/* Message */}
      <p className="text-[15px] text-brown font-medium text-center px-8 animate-pulse">
        {MESSAGES[messageIndex]}
      </p>

      <p className="text-[12px] text-brown-pale mt-3">
        약 5~10초 정도 걸려요
      </p>
    </div>
  );
}
