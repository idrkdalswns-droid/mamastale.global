"use client";

import { useEffect } from "react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

interface TurnFivePopupProps {
  /** Whether the user is logged in */
  isLoggedIn: boolean;
  /** Save chat state before redirecting */
  onPersistChat: () => void;
  /** Navigate back to home (escape hatch) */
  onGoHome?: () => void;
}

export default function TurnFivePopup({ isLoggedIn, onPersistChat, onGoHome }: TurnFivePopupProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBuyTicket = () => {
    onPersistChat();
    window.location.href = "/pricing";
  };

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
                width: "40%",
                background: "linear-gradient(90deg, #E07A5F, #C96B52)",
              }}
            />
          </div>
          <p className="text-xs text-coral font-medium">
            동화의 약 40%가 완성되었어요
          </p>
        </div>

        {/* Loss aversion copy */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.12)" }}
        >
          <p className="text-[13px] text-brown font-normal leading-relaxed text-center break-keep">
            지금까지 나눈 소중한 이야기가
            <br />
            세상에 하나뿐인 <span className="text-coral font-semibold">마음 동화</span>가 됩니다.
            <br />
            <span className="text-brown-light text-xs font-light mt-1 block">
              이 대화를 이어서 동화를 완성해 보세요.
            </span>
          </p>
        </div>

        {isLoggedIn ? (
          /* ── Logged-in: Buy ticket ── */
          <>
            {/* Discount pricing */}
            <div className="text-center mb-4">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-sm text-brown-pale line-through">₩4,900</span>
                <span className="font-serif text-2xl font-bold text-brown">₩3,920</span>
              </div>
              <span
                className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                style={{ background: "#E07A5F" }}
              >
                첫 구매 20% OFF
              </span>
            </div>

            <button
              onClick={handleBuyTicket}
              className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-all active:scale-[0.97] mb-3"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              티켓 구매하고 이어서 만들기
            </button>

            <p className="text-[10px] text-brown-pale font-light text-center">
              결제 후 대화가 그대로 이어집니다 · 완성된 동화는 서재에 영구 보관
            </p>
            {onGoHome && (
              <button onClick={onGoHome} className="block w-full mt-3 text-[11px] text-brown-pale font-light text-center py-2">
                홈으로 돌아가기
              </button>
            )}
          </>
        ) : (
          /* ── Guest: Sign up first ── */
          <>
            <div className="space-y-2 mb-4">
              {[
                { icon: "·", text: "대화 이어서 진행" },
                { icon: "·", text: "동화 영구 보관" },
                { icon: "·", text: "첫 티켓 20% 할인" },
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
              <button onClick={onGoHome} className="block w-full mt-2 text-[11px] text-brown-pale font-light text-center py-2">
                홈으로 돌아가기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
