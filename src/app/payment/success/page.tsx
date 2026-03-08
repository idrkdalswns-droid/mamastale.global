"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

// GA4 gtag type declaration
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Map Toss payment methods to user-friendly labels
const PAYMENT_METHOD_LABELS: Record<string, { label: string }> = {
  카드: { label: "카드" },
  간편결제: { label: "간편결제" },
  계좌이체: { label: "계좌이체" },
  가상계좌: { label: "가상계좌" },
  휴대폰: { label: "휴대폰" },
  // Specific easy pay providers (returned via easyPay.provider)
  카카오페이: { label: "카카오페이" },
  네이버페이: { label: "네이버페이" },
  토스페이: { label: "토스페이" },
};

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"confirming" | "success" | "error" | "ticket_failed">("confirming");
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketsAdded, setTicketsAdded] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [hasSavedChat, setHasSavedChat] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const confirmedRef = useRef(false);
  // Store payment params for retry (URL is cleaned before fetch)
  const paymentParamsRef = useRef<{ paymentKey: string; orderId: string; amount: number; mode: string } | null>(null);

  useEffect(() => {
    // Idempotency guard: prevent double-confirm on re-render or refresh
    if (confirmedRef.current) return;

    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    // mode: "widget" or "standard" — tells backend which secret key to use
    const mode = searchParams.get("mode") || "widget";

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    // Store params for potential retry BEFORE cleaning URL
    const params = { paymentKey, orderId, amount: Number(amount), mode };
    paymentParamsRef.current = params;

    // Mark as confirmed and clean URL BEFORE the fetch to prevent race
    confirmedRef.current = true;
    window.history.replaceState({}, "", "/payment/success");

    // CTO-FIX: Include Bearer token for cookie fallback (mobile browsers)
    const callConfirm = async (p: typeof params) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch { /* ignore */ }
      return fetch("/api/payments/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify(p),
      });
    };

    callConfirm(params)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          // ticketsAdded may be absent on alreadyProcessed responses -- derive from amount
          const derivedTickets = params.amount >= 14900 ? 4 : 1;
          setTicketsAdded(data.ticketsAdded || derivedTickets);
          if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
          setStatus("success");
          // GA4 purchase event for conversion tracking
          try {
            if (typeof window !== "undefined" && typeof window.gtag === "function") {
              window.gtag("event", "purchase", {
                transaction_id: params.orderId,
                currency: "KRW",
                value: params.amount,
                items: [{
                  item_name: params.amount >= 14900 ? "4일 프로그램 번들" : "동화 1편 티켓",
                  quantity: params.amount >= 14900 ? 4 : 1,
                  price: params.amount,
                }],
              });
            }
          } catch { /* ignore analytics errors */ }
        } else if (data.code === "TICKET_INCREMENT_FAILED") {
          // Payment confirmed but ticket grant failed — offer retry (money already charged)
          setStatus("ticket_failed");
        } else {
          // Redirect to fail page with error code (like official Toss sample)
          const errorCode = data.code || "CONFIRM_FAILED";
          router.replace(`/payment/fail?code=${encodeURIComponent(errorCode)}`);
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }, [searchParams, router]);

  // Retry handler for TICKET_INCREMENT_FAILED
  const handleRetryTicket = async () => {
    const params = paymentParamsRef.current;
    if (!params || retrying) return;
    setRetrying(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch { /* ignore */ }
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const derivedTickets = params.amount >= 14900 ? 4 : 1;
        setTicketsAdded(data.ticketsAdded || derivedTickets);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        setStatus("success");
      } else if (data.code === "TICKET_INCREMENT_FAILED") {
        setRetrying(false); // Allow another retry
      } else {
        // On retry, if backend returns success (alreadyProcessed), treat as success
        if (data.success) {
          const derivedTickets = params.amount >= 14900 ? 4 : 1;
          setTicketsAdded(data.ticketsAdded || derivedTickets);
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg("티켓 충전에 실패했습니다. 고객센터에 문의해 주세요.");
        }
      }
    } catch {
      setRetrying(false);
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  // Check if there's a saved chat to resume
  useEffect(() => {
    try { setHasSavedChat(!!localStorage.getItem("mamastale_chat_state")); } catch { /* private browsing */ }
  }, []);

  if (status === "confirming") {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center" role="status" aria-live="polite">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
          <h2 className="font-serif text-xl font-bold text-brown mb-3">
            결제 확인 중...
          </h2>
          <p className="text-sm text-brown-light font-light">
            잠시만 기다려 주세요
          </p>
        </div>
      </div>
    );
  }

  if (status === "ticket_failed") {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center max-w-sm">
          <h2 className="font-serif text-xl font-bold text-brown mb-3">
            티켓 충전 지연
          </h2>
          <p className="text-sm text-brown-light font-light mb-2 break-keep">
            결제는 완료되었으나 티켓 충전에 일시적 오류가 발생했습니다.
          </p>
          <p className="text-sm text-brown-light font-light mb-6 break-keep">
            아래 버튼을 눌러 다시 시도해 주세요.
          </p>
          <button
            onClick={handleRetryTicket}
            disabled={retrying}
            className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-transform active:scale-[0.97] mb-3 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {retrying ? "처리 중..." : "티켓 충전 다시 시도"}
          </button>
          {errorMsg && (
            <p className="text-xs text-coral mb-3">{errorMsg}</p>
          )}
          <p className="text-[11px] text-brown-pale font-light mt-4">
            문제가 계속되면{" "}
            <a
              href="mailto:kang.minjune@icloud.com"
              className="text-coral underline underline-offset-2"
            >
              kang.minjune@icloud.com
            </a>
            으로 문의해 주세요
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center">
          <h2 className="font-serif text-xl font-bold text-brown mb-3">
            결제 확인 실패
          </h2>
          <p className="text-sm text-brown-light font-light mb-6 break-keep">
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-8 py-3 rounded-full text-sm font-medium text-brown-mid"
            style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
          >
            요금 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
      <div
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{
          background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        }}
      >
        <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
          감사합니다, 어머니
        </h2>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-2 break-keep">
          티켓 <span className="text-coral font-semibold">{ticketsAdded}장</span> 구매가 완료되었어요.
        </p>
        {paymentMethod && PAYMENT_METHOD_LABELS[paymentMethod] && (
          <p className="text-[11px] text-brown-pale font-light mb-1">
            {PAYMENT_METHOD_LABELS[paymentMethod].label}로 결제됨
          </p>
        )}
        <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
          {hasSavedChat ? (
            <>이전 대화를 이어서<br /><span className="text-coral font-medium">동화를 완성</span>해 볼까요?</>
          ) : (
            <>이제 아이를 위한 아름다운<br /><span className="text-coral font-medium">세상에 하나뿐인 마음 동화</span>를<br />만들어 볼까요?</>
          )}
        </p>
        <button
          onClick={() => router.push(hasSavedChat ? "/?action=start&payment=success" : "/?payment=success")}
          className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          {hasSavedChat ? "대화 이어서 동화 만들기" : "지금 바로 동화 만들기"}
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
        >
          홈으로 돌아가기
        </button>

        {/* Post-conversion secondary links */}
        <div className="mt-4 pt-4 border-t border-brown-pale/10 space-y-2">
          <button
            onClick={() => router.push("/community")}
            className="w-full py-2.5 rounded-full text-sm font-medium text-brown-mid no-underline transition-all active:scale-[0.97]"
            style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
          >
            커뮤니티 둘러보기
          </button>
          <button
            onClick={async () => {
              const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
              const shareData = {
                title: "mamastale - 엄마의 이야기가 아이의 동화가 됩니다",
                text: "15분 AI 대화로 세상에 하나뿐인 동화를 만들어보세요",
                url: siteUrl,
              };
              if (navigator.share) {
                navigator.share(shareData).catch(() => {});
              } else {
                try {
                  await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                } catch { /* ignore */ }
              }
            }}
            className="w-full py-2.5 rounded-full text-sm font-medium text-brown-pale no-underline transition-all active:scale-[0.97]"
          >
            {shareCopied ? "✓ 링크가 복사되었어요" : "친구에게 공유하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-cream flex items-center justify-center">
          <div className="text-sm text-brown-pale">결제 처리 중...</div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
