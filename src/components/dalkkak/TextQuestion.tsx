"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { useTQEvents } from "@/lib/hooks/tq/useTQEvents";
import { useAuthToken } from "@/lib/hooks/useAuthToken";

interface TextQuestionProps {
  onSubmitted: () => void;
}

export function TextQuestion({ onSubmitted }: TextQuestionProps) {
  const {
    sessionId,
    q20Prompt,
    q20Text,
    setQ20Text,
    setStatus,
    persist,
  } = useTQStore();

  const { track } = useTQEvents();
  const { getHeaders } = useAuthToken();

  const [submitting, setSubmitting] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shownAtRef = useRef(Date.now());

  // Track Q20 shown
  useEffect(() => {
    if (sessionId) {
      track(sessionId, "q20_shown");
    }
    shownAtRef.current = Date.now();
  }, [sessionId, track]);

  // Nudge timers
  useEffect(() => {
    const nudgeTimer = setTimeout(() => setShowNudge(true), 10000);
    const skipTimer = setTimeout(() => setShowSkip(true), 30000);
    return () => {
      clearTimeout(nudgeTimer);
      clearTimeout(skipTimer);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= 500) {
        setQ20Text(val);
        if (!hasStartedTyping && val.length > 0) {
          setHasStartedTyping(true);
          setShowNudge(false); // Hide nudge once typing starts
        }
      }
    },
    [setQ20Text, hasStartedTyping],
  );

  const handleSubmit = useCallback(
    async (skipText = false) => {
      if (!sessionId || submitting) return;
      setSubmitting(true);

      try {
        const headers = await getHeaders({ json: true });
        const res = await fetch("/api/tq/submit", {
          method: "POST",
          headers,
          body: JSON.stringify({
            session_id: sessionId,
            q20_text: skipText ? "" : q20Text.trim(),
          }),
        });

        if (!res.ok) {
          console.error("[TQ] Submit failed");
          setSubmitting(false);
          return;
        }

        track(sessionId, "q20_submitted", {
          textLength: skipText ? 0 : q20Text.trim().length,
          timeSpentMs: Date.now() - shownAtRef.current,
        });

        setStatus("generating");
        persist();
        onSubmitted();
      } catch (err) {
        console.error("[TQ] Submit error:", err);
        setSubmitting(false);
      }
    },
    [sessionId, q20Text, submitting, getHeaders, track, setStatus, persist, onSubmitted],
  );

  const prompt = q20Prompt || {
    title: "마지막 질문",
    instruction: "자유롭게 적어주세요",
    placeholder: "여기에 적어주세요...",
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6"
      >
        <h2 className="font-serif text-[20px] text-brown font-bold mb-2 break-keep">
          {prompt.title}
        </h2>
        <p className="text-[13px] text-brown-light font-light break-keep">
          {prompt.instruction}
        </p>
      </motion.div>

      {/* Letter-style textarea */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full rounded-2xl p-5 mb-4"
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1.5px solid rgba(196,149,106,0.15)",
          boxShadow: "0 4px 20px rgba(90,62,43,0.06)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={q20Text}
          onChange={handleChange}
          placeholder={prompt.placeholder}
          maxLength={500}
          rows={6}
          className="w-full resize-none bg-transparent font-serif text-[15px] text-brown leading-relaxed placeholder:text-brown-pale/50 focus:outline-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 27px, rgba(196,149,106,0.08) 27px, rgba(196,149,106,0.08) 28px)",
            backgroundSize: "100% 28px",
            lineHeight: "28px",
          }}
          disabled={submitting}
          autoFocus
        />
        <p className="text-right text-[11px] text-brown-pale mt-1">
          {q20Text.length} / 500
        </p>
      </motion.div>

      {/* Encouragement or nudge */}
      <AnimatePresence>
        {hasStartedTyping && q20Text.length > 10 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[12px] text-brown-light font-light mb-4"
          >
            좋아요, 계속 적어주세요
          </motion.p>
        )}
        {showNudge && !hasStartedTyping && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[12px] text-brown-pale font-light mb-4"
          >
            떠오르는 생각을 자유롭게 적어보세요
          </motion.p>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full space-y-3"
      >
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting || q20Text.trim().length === 0}
          className="w-full py-3.5 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #C4956A, #A8804E)",
            boxShadow: "0 6px 24px rgba(196,149,106,0.3)",
          }}
        >
          {submitting ? "동화를 만들고 있어요..." : "동화 만들기"}
        </button>

        {/* Skip button (appears after 30s) */}
        <AnimatePresence>
          {showSkip && !hasStartedTyping && !submitting && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => handleSubmit(true)}
              className="w-full py-2 text-[12px] text-brown-pale font-light underline underline-offset-2 decoration-brown-pale/30"
            >
              건너뛰기
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
