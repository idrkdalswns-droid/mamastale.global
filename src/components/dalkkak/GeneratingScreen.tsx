"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { useSSEConnection } from "@/lib/hooks/tq/useSSEConnection";
import { useTQEvents } from "@/lib/hooks/tq/useTQEvents";

export function GeneratingScreen() {
  const router = useRouter();
  const { sessionId, generationProgress, status, resetAll } = useTQStore();
  const { track } = useTQEvents();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const totalScenes = 9;

  const handleComplete = useCallback(
    (storyId: string) => {
      if (sessionId) {
        track(sessionId, "generation_complete", { storyId });
      }
      router.push(`/dalkkak/result/${storyId}`);
    },
    [sessionId, track, router],
  );

  const handleError = useCallback(
    (message: string) => {
      setErrorMsg(message);
      if (sessionId) {
        track(sessionId, "generation_failed", { message });
      }
    },
    [sessionId, track],
  );

  const { mode } = useSSEConnection(
    sessionId,
    status === "generating",
    {
      onProgress: () => {},
      onComplete: handleComplete,
      onError: handleError,
    },
  );

  const handleRetry = useCallback(() => {
    resetAll();
    router.replace("/dalkkak");
  }, [resetAll, router]);

  const progress = Math.min(generationProgress, totalScenes);
  const progressPercent = (progress / totalScenes) * 100;

  // Error state
  if (errorMsg) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5" style={{ background: "rgb(var(--tq-p5-bg))" }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(224,122,95,0.12)" }}>
            <span className="text-2xl">😢</span>
          </div>
          <p className="text-[15px] text-brown font-medium mb-2 break-keep">
            동화 생성에 실패했어요
          </p>
          <p className="text-[13px] text-brown-light font-light mb-6 break-keep">
            {errorMsg || "티켓이 환불되었어요. 다시 시도해 주세요."}
          </p>
          <button
            onClick={handleRetry}
            className="px-8 py-3 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #C4956A, #A8804E)",
              boxShadow: "0 4px 16px rgba(196,149,106,0.3)",
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5" style={{ background: "rgb(var(--tq-p5-bg))" }}>
      <div className="text-center max-w-sm w-full">
        {/* Animated icon */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #C4956A, #A8804E)",
            boxShadow: "0 8px 32px rgba(196,149,106,0.3)",
          }}
        >
          <span className="text-2xl">✨</span>
        </motion.div>

        <p className="font-serif text-[18px] text-brown font-bold mb-2">
          당신만의 동화를 쓰고 있어요
        </p>
        <p className="text-[13px] text-brown-light font-light mb-8">
          잠시만 기다려 주세요
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto mb-3">
          <div className="h-1.5 rounded-full bg-brown-pale/15 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #C4956A, #D4A574)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Progress text */}
        <p
          className="text-[12px] text-brown-pale font-light"
          aria-live={progress >= totalScenes ? "assertive" : "off"}
        >
          {progress > 0
            ? `장면 ${progress} / ${totalScenes} 생성 중...`
            : "준비 중..."}
        </p>

        {/* Mode indicator (subtle) */}
        {mode === "polling" && (
          <p className="text-[10px] text-brown-pale/50 mt-2">
            안정 모드로 연결됨
          </p>
        )}
      </div>
    </div>
  );
}
