"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log to error reporting service
    console.error("[mamastale] Unexpected error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
      <div className="text-center">
        <div className="text-[56px] mb-4">🌿</div>
        <h1
          className="text-xl font-semibold mb-2"
          style={{
            color: "rgb(var(--brown))",
            fontFamily: "'Nanum Myeongjo', serif",
          }}
        >
          잠시 쉬어가는 시간이에요
        </h1>
        <p
          className="text-sm font-light mb-8 leading-relaxed"
          style={{ color: "rgb(var(--brown-light))" }}
        >
          예상치 못한 문제가 생겼어요.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            다시 시도하기
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              border: "1.5px solid rgba(196,149,106,0.25)",
              color: "rgb(var(--brown-mid))",
            }}
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
