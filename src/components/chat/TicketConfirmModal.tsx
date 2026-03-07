"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface TicketConfirmModalProps {
  remainingTickets: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Ticket usage confirmation modal.
 * Shown before starting a new story chat for logged-in users.
 * Deducts 1 ticket on confirmation, then proceeds to onboarding/chat.
 */
export default function TicketConfirmModal({
  remainingTickets,
  onConfirm,
  onCancel,
}: TicketConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // P0-FIX(US-3): Ref-based mutex to prevent double-click race condition.
  // React state updates are async; useRef provides synchronous guard.
  const submittingRef = useRef(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleConfirm = async () => {
    if (submittingRef.current) return; // Already in-flight — ignore duplicate clicks
    submittingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // ROOT-CAUSE FIX: Add Bearer token alongside cookies for mobile/embed compatibility.
      // Some browsers (WebView, in-app browsers) strip cookies on same-origin requests,
      // causing 401 errors. Bearer token ensures auth works everywhere.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch {
        // Session read failed — proceed with cookies only
      }

      const res = await fetch("/api/tickets/use", {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "no_tickets") {
          setError("티켓이 부족합니다. 충전 후 다시 시도해 주세요.");
        } else if (res.status === 401) {
          // Session expired — guide user to re-login
          setError("로그인이 만료되었습니다. 페이지를 새로고침해 주세요.");
        } else {
          // Show server error message for better debugging
          setError(data.error || "오류가 발생했습니다. 다시 시도해 주세요.");
        }
        submittingRef.current = false;
        setIsLoading(false);
        return;
      }

      // Ticket deducted successfully → proceed
      onConfirm();
    } catch {
      setError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.");
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="티켓 사용 확인"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="w-full max-w-[320px] rounded-3xl p-7 text-center"
        style={{
          background: "linear-gradient(180deg, #FFFAF6, #FFFFFF)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        }}
      >
        {/* Title */}
        <h3 className="font-serif text-lg font-bold text-brown mb-2 leading-tight">
          우리 아이만을 위한 동화
        </h3>

        {/* Description */}
        <p className="text-[13px] text-brown-light font-light leading-relaxed mb-1 break-keep">
          티켓 한 장을 사용하여<br />
          세상에 하나뿐인 동화를 만들까요?
        </p>

        {/* Ticket count */}
        <p className="text-[11px] text-brown-pale font-light mb-5">
          보유 티켓: <span className="font-semibold text-coral">{remainingTickets}장</span>
          {remainingTickets <= 1 && " (마지막 티켓이에요!)"}
        </p>

        {/* Error message */}
        {error && (
          <p className="text-[11px] text-red-500 font-medium mb-3">
            {error}
          </p>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full py-3.5 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-60 mb-2"
          style={{
            background: isLoading
              ? "rgba(224,122,95,0.6)"
              : "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: isLoading
              ? "none"
              : "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              준비 중...
            </span>
          ) : (
            "티켓 1장 사용하고 시작하기"
          )}
        </button>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="w-full py-2.5 min-h-[44px] text-[12px] font-light text-brown-pale transition-all disabled:opacity-40"
        >
          다음에 할게요
        </button>
      </motion.div>
    </motion.div>
  );
}
