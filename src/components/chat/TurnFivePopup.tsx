"use client";

import { useState, useEffect, useRef } from "react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { createClient } from "@/lib/supabase/client";
import { nameWithParticle } from "@/lib/utils/korean";

interface TurnFivePopupProps {
  /** Whether the user is logged in */
  isLoggedIn: boolean;
  /** Current ticket balance (null = not loaded yet) */
  ticketsRemaining?: number | null;
  /** Save chat state before redirecting */
  onPersistChat: () => void;
  /** Navigate back to home (escape hatch) */
  onGoHome?: () => void;
  /** Called after inline ticket deduction succeeds (lifts free trial limit) */
  onTicketUsed?: () => void;
}

/**
 * C-1 + SV-3: Turn-gate popup shown after 3 free turns.
 * - Guest: login prompt (OAuth buttons)
 * - Logged-in with tickets: inline ticket deduction
 * - Logged-in without tickets: redirect to /pricing
 */
export default function TurnFivePopup({
  isLoggedIn,
  ticketsRemaining,
  onPersistChat,
  onGoHome,
  onTicketUsed,
}: TurnFivePopupProps) {
  // Read child name for personalized messaging
  const childName = (() => {
    try { return localStorage.getItem("mamastale_child_name") || ""; } catch { return ""; }
  })();

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Inline ticket deduction state ──
  const [isUsingTicket, setIsUsingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const handleBuyTicket = () => {
    onPersistChat();
    window.location.href = "/pricing";
  };

  /** Deduct ticket inline and call onTicketUsed to lift turn limit */
  const handleUseTicket = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsUsingTicket(true);
    setTicketError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch { /* Session read failed — proceed with cookies */ }

      const res = await fetch("/api/tickets/use", {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (res.ok) {
        // Ticket deducted → lift free trial limit (popup will auto-dismiss)
        onTicketUsed?.();
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === "no_tickets") {
          setTicketError("티켓이 부족합니다. 충전 후 다시 시도해 주세요.");
        } else if (res.status === 401) {
          setTicketError("로그인이 만료되었습니다. 페이지를 새로고침해 주세요.");
        } else {
          setTicketError(data.error || "오류가 발생했습니다. 다시 시도해 주세요.");
        }
        submittingRef.current = false;
      }
    } catch {
      setTicketError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.");
      submittingRef.current = false;
    } finally {
      setIsUsingTicket(false);
    }
  };

  const hasTickets = ticketsRemaining !== null && ticketsRemaining !== undefined && ticketsRemaining > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="대화 이어가기 안내"
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 max-h-[90dvh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{
          background: "linear-gradient(180deg, rgb(var(--cream)), rgb(var(--surface)))",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-brown-pale/30" />
        </div>

        {/* Progress indicator */}
        <div className="text-center mb-4">
          <h3 className="font-serif text-lg font-bold text-brown mb-1.5 leading-tight">
            동화가 만들어지고 있어요
          </h3>
          <div
            className="mx-auto w-[70%] h-2 rounded-full overflow-hidden mb-2"
            style={{ background: "rgba(196,149,106,0.12)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: "25%",
                background: "linear-gradient(90deg, #E07A5F, #C96B52)",
              }}
            />
          </div>
          <p className="text-xs text-coral font-medium">
            동화의 약 25%가 완성되었어요
          </p>
        </div>

        {/* Loss aversion copy */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.12)" }}
        >
          <p className="text-[13px] text-brown font-normal leading-relaxed text-center break-keep">
            {childName ? (
              <>
                {nameWithParticle(childName, "이를", "를")} 위한 소중한 이야기가
                <br />
                세상에 하나뿐인 <span className="text-coral font-semibold">마음 동화</span>가 됩니다.
                <br />
                <span className="text-brown-light text-xs font-light mt-1 block">
                  {nameWithParticle(childName, "이에게", "에게")} 읽어줄 동화를 완성해 보세요.
                </span>
              </>
            ) : (
              <>
                지금까지 나눈 소중한 이야기가
                <br />
                세상에 하나뿐인 <span className="text-coral font-semibold">마음 동화</span>가 됩니다.
                <br />
                <span className="text-brown-light text-xs font-light mt-1 block">
                  이 대화를 이어서 동화를 완성해 보세요.
                </span>
              </>
            )}
          </p>
        </div>

        {isLoggedIn ? (
          hasTickets ? (
            /* ── Logged-in WITH tickets: inline ticket deduction ── */
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-brown font-medium break-keep">
                  {childName
                    ? `${nameWithParticle(childName, "이를", "를")} 위한 동화를 완성할까요?`
                    : "만들기 1회를 사용하여 동화를 완성할까요?"}
                </p>
                <p className="text-xs text-brown-pale font-light mt-1">
                  남은 횟수: <span className="font-semibold text-coral">{ticketsRemaining}회</span>
                  {ticketsRemaining === 1 && " (마지막 1회예요!)"}
                </p>
              </div>

              {ticketError && (
                <p className="text-[13px] text-red-500 font-medium mb-3 text-center">
                  {ticketError}
                </p>
              )}

              <button
                onClick={handleUseTicket}
                disabled={isUsingTicket}
                className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60 mb-3"
                style={{
                  background: isUsingTicket
                    ? "rgba(224,122,95,0.6)"
                    : "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: isUsingTicket
                    ? "none"
                    : "0 6px 20px rgba(224,122,95,0.3)",
                }}
              >
                {isUsingTicket ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    처리 중...
                  </span>
                ) : (
                  "1회 사용하고 이어서 만들기"
                )}
              </button>

              <p className="text-[10px] text-brown-pale font-light text-center">
                완성된 동화는 서재에 영구 보관됩니다
              </p>
              {onGoHome && (
                <button onClick={onGoHome} className="block w-full mt-3 text-[11px] text-brown-pale font-light text-center py-2 min-h-[44px]">
                  홈으로 돌아가기
                </button>
              )}
            </>
          ) : (
            /* ── Logged-in WITHOUT tickets: redirect to pricing ── */
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-brown font-medium">
                  만들기 1회면 동화가 완성돼요
                </p>
                <p className="text-xs text-brown-pale font-light mt-1">
                  ₩4,900부터
                </p>
              </div>

              <button
                onClick={handleBuyTicket}
                className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-all active:scale-[0.97] mb-3"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                }}
              >
                구매하고 이어서 만들기
              </button>

              <p className="text-[10px] text-brown-pale font-light text-center">
                결제 후 대화가 그대로 이어집니다 · 완성된 동화는 서재에 영구 보관
              </p>
              {onGoHome && (
                <button onClick={onGoHome} className="block w-full mt-3 text-[11px] text-brown-pale font-light text-center py-2 min-h-[44px]">
                  홈으로 돌아가기
                </button>
              )}
            </>
          )
        ) : (
          /* ── Guest: sign up first ── */
          <>
            <div className="space-y-2 mb-4">
              {[
                { icon: "·", text: "대화 이어서 진행" },
                { icon: "·", text: "동화 영구 보관" },
                { icon: "·", text: "첫 구매 20% 할인" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: "rgba(224,122,95,0.05)" }}>
                  <span className="text-sm">{b.icon}</span>
                  <span className="text-xs text-brown font-medium">{b.text}</span>
                </div>
              ))}
            </div>

            <OAuthButtons disabled={false} onBeforeRedirect={onPersistChat} />

            <p className="text-[10px] text-brown-pale font-light text-center mt-3">
              대화 내용은 안전하게 보관됩니다
            </p>
            {onGoHome && (
              <button onClick={onGoHome} className="block w-full mt-2 text-[11px] text-brown-pale font-light text-center py-2 min-h-[44px]">
                홈으로 돌아가기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
