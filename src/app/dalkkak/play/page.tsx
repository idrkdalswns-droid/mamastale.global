"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { useAuthToken } from "@/lib/hooks/useAuthToken";
import { useTQEvents } from "@/lib/hooks/tq/useTQEvents";
import { TQ_PHASES } from "@/lib/constants/tq-phases";
import { DoorProgress } from "@/components/dalkkak/DoorProgress";
import { QuestionFlow } from "@/components/dalkkak/QuestionFlow";
import { BackButton } from "@/components/dalkkak/BackButton";

export default function DalkkakPlayPage() {
  const router = useRouter();
  const { getHeaders } = useAuthToken();
  const { track } = useTQEvents();

  const {
    sessionId,
    status,
    currentPhase,
    currentQuestionIndex,
    questions,
    responses,
    restore,
    setQuestions,
    setStatus,
    persist,
    resetAll,
  } = useTQStore();

  const [showResumeCard, setShowResumeCard] = useState(false);
  const [loading, setLoading] = useState(true);

  // Guard: ensure session exists
  useEffect(() => {
    if (sessionId && (status === "active" || status === "generating")) {
      // Session already in store (active or awaiting generation)
      setLoading(false);
      return;
    }

    // Try localStorage restore
    const restored = restore();
    if (!restored) {
      router.replace("/dalkkak");
      return;
    }

    const state = useTQStore.getState();
    if (!state.sessionId) {
      router.replace("/dalkkak");
      return;
    }

    // Show resume card if they had progress
    if (state.currentQuestionIndex > 0 || state.currentPhase > 1) {
      setShowResumeCard(true);
    }

    setLoading(false);
  }, [sessionId, status, restore, router]);

  // Fetch current questions from server if not in store
  useEffect(() => {
    if (!sessionId || questions.length > 0 || loading) return;
    // generating/completed 상태에서는 서버 동기화 불필요
    // — GeneratingScreen이 SSE로 직접 처리, completed는 이미 결과 페이지로 이동 중
    if (status === "generating" || status === "completed") return;

    (async () => {
      try {
        const headers = await getHeaders();
        const res = await fetch(`/api/tq/${sessionId}`, { headers });
        if (!res.ok) {
          router.replace("/dalkkak");
          return;
        }
        const data = await res.json();

        // 화이트리스트: 서버 상태별 명시적 처리
        const serverStatus = data.session?.status;

        if (serverStatus === "in_progress") {
          // 정상: 질문 로딩
          if (data.current_questions && Array.isArray(data.current_questions) && data.current_questions.length > 0) {
            setQuestions(data.current_questions);
            // Restore question index within current phase based on server responses
            const serverResponses = data.session?.responses ?? [];
            const serverPhase = data.session?.phase ?? 1;
            const phaseResponses = serverResponses.filter(
              (r: { phase: number }) => r.phase === serverPhase,
            );
            if (phaseResponses.length > 0 && phaseResponses.length < data.current_questions.length) {
              useTQStore.setState({ currentQuestionIndex: phaseResponses.length });
            }
          }
          return;
        }

        if (serverStatus === "completed" && data.session?.story_id) {
          router.replace(`/dalkkak/result/${data.session.story_id}`);
          return;
        }

        if (serverStatus === "generating") {
          // 서버가 generating → 클라이언트도 generating으로 동기화
          // (early return 가드에서 이미 generating은 처리되지만, 방어적으로 동기화)
          setStatus("generating");
          return;
        }

        // cancelled, failed, unknown → 랜딩으로
        router.replace("/dalkkak");
      } catch {
        router.replace("/dalkkak");
      }
    })();
  }, [sessionId, questions.length, loading, status, getHeaders, setQuestions, setStatus, router]);

  // Auto-save on visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        persist();
      }
    };
    const handleBeforeUnload = () => persist();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persist]);

  const handleResume = useCallback(() => {
    setShowResumeCard(false);
  }, []);

  const handleRestartNew = useCallback(() => {
    resetAll();
    router.replace("/dalkkak");
  }, [resetAll, router]);

  const handleGenerationStart = useCallback(() => {
    setStatus("generating");
    if (sessionId) {
      track(sessionId, "generation_start");
    }
    persist();
    // Generation screen will be handled by Phase 4-S6
    // No navigation needed — QuestionFlow checks status and renders GeneratingScreen
  }, [sessionId, setStatus, track, persist, router]);

  // Calculate question position within phase
  const phase = TQ_PHASES[currentPhase];
  const phaseRange = phase?.questionRange || [1, 4];
  const totalQuestionsInPhase = phaseRange[1] - phaseRange[0] + 1;
  // Use responses count for current phase to track actual progress
  // (handles Phase 1 Q1→branch split where question sets change)
  const phaseResponseCount = responses.filter(
    (r) => {
      // ID 형식: "q1"-"q4" (Phase 1 정적) 또는 "p2q5" (AI 생성)
      const match = r.questionId.match(/q(\d+)$/);
      const qNum = match ? parseInt(match[1], 10) : 0;
      return qNum >= phaseRange[0] && qNum <= phaseRange[1];
    },
  ).length;
  const questionInPhase = Math.min(phaseResponseCount, totalQuestionsInPhase - 1);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center tq-phase-bg" data-tq-phase={currentPhase}>
        <div className="w-6 h-6 border-2 border-brown-pale/30 border-t-brown-pale rounded-full animate-spin" />
      </div>
    );
  }

  // Resume card
  if (showResumeCard) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5 tq-phase-bg" data-tq-phase={currentPhase}>
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1.5px solid rgba(196,149,106,0.12)",
            boxShadow: "0 8px 32px rgba(90,62,43,0.08)",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: phase?.accent || "#D4A574",
              boxShadow: `0 4px 16px ${phase?.accent || "#D4A574"}30`,
            }}
          >
            <span className="text-white text-lg font-bold">{currentPhase}</span>
          </div>
          <p className="text-[15px] font-semibold text-brown mb-1">
            {phase?.doorLabel || `${currentPhase}단계`}까지 진행했어요
          </p>
          <p className="text-[12px] text-brown-light font-light mb-5">
            이어서 하시겠어요?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleResume}
              className="flex-1 py-3 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${phase?.accent || "#D4A574"}, ${phase?.accent || "#D4A574"}cc)`,
                boxShadow: `0 4px 16px ${phase?.accent || "#D4A574"}30`,
              }}
            >
              이어하기
            </button>
            <button
              onClick={handleRestartNew}
              className="px-4 py-3 rounded-full text-[13px] font-light text-brown-pale transition-all"
              style={{ border: "1px solid rgba(196,149,106,0.2)" }}
            >
              새로 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col tq-phase-bg" data-tq-phase={currentPhase}>
      {/* Header */}
      <div className="shrink-0 pt-2 pb-1 px-4">
        <div className="flex items-center justify-between mb-2">
          <BackButton />
          <div className="flex-1" />
        </div>
        <DoorProgress
          currentPhase={currentPhase}
          currentQuestionInPhase={questionInPhase}
          totalQuestionsInPhase={totalQuestionsInPhase}
        />
      </div>

      {/* Main content */}
      <QuestionFlow onGenerationStart={handleGenerationStart} />
    </div>
  );
}
