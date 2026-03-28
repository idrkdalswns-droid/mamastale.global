"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { useTQEvents } from "@/lib/hooks/tq/useTQEvents";
import { useAuthToken } from "@/lib/hooks/useAuthToken";
import { TQ_PHASES } from "@/lib/constants/tq-phases";
import { QuestionCard } from "./QuestionCard";
import { PhaseTransition } from "./PhaseTransition";
import { TextQuestion } from "./TextQuestion";
import { GeneratingScreen } from "./GeneratingScreen";
import type { TQQuestion } from "@/lib/hooks/tq/questionSlice";

interface QuestionFlowProps {
  onGenerationStart: () => void;
}

export function QuestionFlow({ onGenerationStart }: QuestionFlowProps) {
  const {
    sessionId,
    status,
    currentPhase,
    questions,
    currentQuestionIndex,
    q20Prompt,
    isTransitioning,
    isLoading,
    addResponse,
    nextQuestion,
    setQuestions,
    setPhase,
    setTransitioning,
    setLoading,
    setQ20Prompt,
    setStatus,
    persist,
  } = useTQStore();

  const { track } = useTQEvents();
  const { getHeaders } = useAuthToken();

  const [transitionReady, setTransitionReady] = useState(false);
  const [transitionToPhase, setTransitionToPhase] = useState(0);

  const currentQuestion = questions[currentQuestionIndex] as TQQuestion | undefined;
  const phase = TQ_PHASES[currentPhase];

  // Calculate question position within phase
  const phaseRange = phase?.questionRange || [1, 4];
  const totalQuestionsInPhase = phaseRange[1] - phaseRange[0] + 1;

  const handleAnswer = useCallback(
    async (choiceId: number, choiceText: string, scores: Record<string, number>) => {
      if (!sessionId || !currentQuestion || isLoading) return;

      // Record response locally
      addResponse({
        questionId: currentQuestion.id,
        choiceId,
        choiceText,
        scores,
        answeredAt: Date.now(),
      });

      // Track event
      track(sessionId, "question_answered", {
        questionId: currentQuestion.id,
        choiceId,
        phase: currentPhase,
      });

      // Q17 prewarming
      if (currentQuestion.id === "q17") {
        fetch("/api/tq/submit", { method: "OPTIONS" }).catch(() => {});
      }

      setLoading(true);

      try {
        const headers = await getHeaders({ json: true });
        const res = await fetch("/api/tq/next-phase", {
          method: "POST",
          headers,
          body: JSON.stringify({
            session_id: sessionId,
            question_id: currentQuestion.id,
            choice_id: choiceId,
            choice_text: choiceText,
            scores,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("[TQ] next-phase error:", err);
          setLoading(false);
          return;
        }

        const data = await res.json();

        // Case a: Same phase, next question loaded inline
        if (data.acknowledged && !data.questions) {
          nextQuestion();
          setLoading(false);
          persist();
          return;
        }

        // Case b: Phase transition with new questions
        if (data.questions && data.phase) {
          // Show interstitial
          setTransitionToPhase(data.phase);
          setTransitionReady(false);
          setTransitioning(true);

          // Prepare new questions in background
          const newQuestions: TQQuestion[] = data.questions;

          // Signal ready after questions are parsed
          setTimeout(() => {
            setQuestions(newQuestions);
            setPhase(data.phase);
            // Phase 5 includes q20_prompt alongside MCQ questions
            if (data.q20_prompt) {
              setQ20Prompt(data.q20_prompt);
            }
            setTransitionReady(true);
          }, 500);

          // Track phase transition
          track(sessionId, "phase_transition", {
            from: currentPhase,
            to: data.phase,
          });

          setLoading(false);
          persist();
          return;
        }

        // Case c: Phase 5 with Q20 prompt
        if (data.questions && data.q20_prompt) {
          setTransitionToPhase(5);
          setTransitionReady(false);
          setTransitioning(true);

          setTimeout(() => {
            setQuestions(data.questions);
            setPhase(5);
            setQ20Prompt(data.q20_prompt);
            setTransitionReady(true);
          }, 500);

          track(sessionId, "phase_transition", { from: currentPhase, to: 5 });
          setLoading(false);
          persist();
          return;
        }

        // Default: just advance
        nextQuestion();
        setLoading(false);
        persist();
      } catch (err) {
        console.error("[TQ] Answer submission failed:", err);
        setLoading(false);
      }
    },
    [
      sessionId, currentQuestion, currentPhase, isLoading,
      addResponse, nextQuestion, setQuestions, setPhase,
      setTransitioning, setLoading, setQ20Prompt, setStatus,
      persist, track, getHeaders, onGenerationStart,
    ],
  );

  const handleTransitionComplete = useCallback(() => {
    setTransitioning(false);
    setTransitionReady(false);
    persist();
  }, [setTransitioning, persist]);

  // Generating screen
  if (status === "generating") {
    return <GeneratingScreen />;
  }

  // Q20 text question (Phase 5, all MCQs answered, q20Prompt is set)
  if (q20Prompt && currentPhase === 5 && !isTransitioning && !currentQuestion) {
    return (
      <TextQuestion
        onSubmitted={() => {
          setStatus("generating");
          persist();
          onGenerationStart();
        }}
      />
    );
  }

  // Phase transition interstitial
  if (isTransitioning && transitionToPhase > 0) {
    return (
      <PhaseTransition
        fromPhase={currentPhase}
        toPhase={transitionToPhase}
        isReady={transitionReady}
        onComplete={handleTransitionComplete}
      />
    );
  }

  // Loading state
  if (isLoading && !currentQuestion) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brown-pale/30 border-t-brown-pale rounded-full animate-spin" />
      </div>
    );
  }

  // No question available
  if (!currentQuestion) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-brown-light font-light">질문을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            phaseAccent={phase?.accent || "#D4A574"}
            disabled={isLoading}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
