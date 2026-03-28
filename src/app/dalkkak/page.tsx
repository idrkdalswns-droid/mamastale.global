"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthToken } from "@/lib/hooks/useAuthToken";
import { useTickets } from "@/lib/hooks/useTickets";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { TQ_PHASES } from "@/lib/constants/tq-phases";

export default function DalkkakLandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getHeaders } = useAuthToken();
  const { tickets } = useTickets();
  const { restore, initSession, setQuestions, resetAll } = useTQStore();

  const [starting, setStarting] = useState(false);
  const [existingSession, setExistingSession] = useState<{
    id: string;
    phase: number;
    created_at: string;
  } | null>(null);

  // Check for existing session from localStorage
  useEffect(() => {
    const restored = restore();
    if (restored) {
      const state = useTQStore.getState();
      if (state.sessionId && state.status === "active") {
        setExistingSession({
          id: state.sessionId,
          phase: state.currentPhase,
          created_at: "",
        });
      }
    }
  }, [restore]);

  const handleStart = async (forceNew = false) => {
    if (!user) {
      router.push("/login?redirect=/dalkkak");
      return;
    }

    if (forceNew) {
      resetAll();
      setExistingSession(null);
    }

    setStarting(true);
    try {
      const headers = await getHeaders({ json: true });
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch("/api/tq/start", {
        method: "POST",
        headers,
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "NO_TICKETS") {
          router.push("/pricing");
          return;
        }
        throw new Error(data.error || "세션 시작에 실패했습니다.");
      }

      const data = await res.json();

      // Existing session returned
      if (data.existing_session) {
        setExistingSession(data.existing_session);
        setStarting(false);
        return;
      }

      // New session created
      initSession(data.session_id, data.phase || 1);
      if (data.question) {
        setQuestions([data.question]);
      }
      useTQStore.getState().persist();
      router.push("/dalkkak/play");
    } catch (err) {
      console.error("[Dalkkak] Start failed:", err);
      setStarting(false);
    }
  };

  const handleResume = () => {
    if (existingSession) {
      initSession(existingSession.id, existingSession.phase);
      useTQStore.getState().persist();
      router.push("/dalkkak/play");
    }
  };

  const isFree = tickets !== null && tickets <= 0;

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "rgb(var(--tq-p1-bg))" }}>
        <div className="w-6 h-6 border-2 border-brown-pale/30 border-t-brown-pale rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative overflow-hidden" style={{ background: "rgb(var(--tq-p1-bg))" }}>
      <div className="max-w-md mx-auto px-5 pt-12 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <h1 className="font-serif text-[22px] font-bold text-brown leading-snug mb-3 break-keep">
            스무 개의 질문이<br />당신만의 동화를 만들어요
          </h1>
          <p className="text-[13px] text-brown-light font-light">
            약 10분 · 선택형 질문 19개 + 서술 1개
          </p>
        </motion.div>

        {/* 5 Doors Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((phase) => {
              const p = TQ_PHASES[phase];
              return (
                <div key={phase} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-bold"
                    style={{
                      background: p.accent,
                      boxShadow: `0 2px 8px ${p.accent}33`,
                    }}
                  >
                    {phase}
                  </div>
                  <span className="text-[10px] text-brown-pale font-light whitespace-nowrap">
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Existing session card */}
        {existingSession && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="rounded-2xl p-4 mb-5"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(196,149,106,0.15)",
              boxShadow: "0 4px 12px rgba(90,62,43,0.04)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: TQ_PHASES[existingSession.phase]?.accent || "#D4A574" }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M14 2L18 6L8 16H4V12L14 2Z" fill="white" fillOpacity="0.9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-brown">진행 중인 세션</p>
                <p className="text-[11px] text-brown-pale font-light">
                  {TQ_PHASES[existingSession.phase]?.doorLabel || `${existingSession.phase}단계`}까지 진행
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResume}
                className="flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-white text-center transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #9B8EC4, #7B6FA0)" }}
              >
                ��어하기
              </button>
              <button
                onClick={() => handleStart(true)}
                disabled={starting}
                className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-light text-brown-pale transition-all"
                style={{ border: "1px solid rgba(196,149,106,0.2)" }}
              >
                새로 시작
              </button>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: existingSession ? 0.6 : 0.4, duration: 0.5 }}
        >
          {!existingSession && (
            <button
              onClick={() => handleStart(false)}
              disabled={starting}
              className="w-full py-4 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #9B8EC4, #7B6FA0)",
                boxShadow: "0 6px 24px rgba(155,142,196,0.3)",
              }}
            >
              {starting
                ? "준비 중..."
                : isFree
                  ? "무료로 시작하기"
                  : "시작하기"}
            </button>
          )}

          {/* Back to home */}
          <button
            onClick={() => router.push("/")}
            className="block w-full text-center text-[12px] text-brown-pale underline underline-offset-2 decoration-brown-pale/30 mt-4 py-2"
          >
            홈으로 돌아가기
          </button>
        </motion.div>
      </div>
    </div>
  );
}
