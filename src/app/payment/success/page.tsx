"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { trackPaymentAbandon } from "@/lib/utils/analytics";

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
  // T-3: Receipt info for display
  const [receiptOrderId, setReceiptOrderId] = useState<string>("");
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptDate] = useState(() => new Date().toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }));
  const [hasSavedChat, setHasSavedChat] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [autoRedirectCount, setAutoRedirectCount] = useState(15); // 5→15초 (사용자가 읽을 시간 확보)
  const autoRedirectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false);
  // R5-CRIT2: Track status in ref to avoid stale closure in setTimeout
  const statusRef = useRef(status);
  statusRef.current = status;
  // Store payment params for retry (URL is cleaned before fetch)
  const paymentParamsRef = useRef<{ paymentKey: string; orderId: string; amount: number; mode: string } | null>(null);

  // Restore receipt info from sessionStorage on refresh (URL params already cleaned)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mamastale_receipt");
      if (cached) {
        const { amount, orderId } = JSON.parse(cached);
        if (amount) setReceiptAmount(amount);
        if (orderId) setReceiptOrderId(orderId);
      }
    } catch { /* private browsing or parse error */ }
  }, []);

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
      trackPaymentAbandon("missing_params");
      return;
    }

    // Store params for potential retry BEFORE cleaning URL
    const params = { paymentKey, orderId, amount: Number(amount), mode };
    paymentParamsRef.current = params;
    // T-3: Save receipt info before URL cleaning
    setReceiptOrderId(orderId);
    setReceiptAmount(Number(amount));

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

    // R7-4: Track mounted state for cleanup (prevent setState on unmounted)
    let mounted = true;

    // R7-FIX: 15s timeout fallback — prevents infinite spinner on slow/hung networks
    // R5-CRIT2: Use statusRef.current to avoid stale closure
    const timeoutId = setTimeout(() => {
      if (mounted && statusRef.current === "confirming") {
        setStatus("error");
        setErrorMsg("결제 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
        trackPaymentAbandon("timeout");
      }
    }, 15_000);

    callConfirm(params)
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (!mounted) return;
        const data = await res.json();
        if (res.ok && data.success) {
          // ticketsAdded may be absent on alreadyProcessed responses -- derive from amount
          const derivedTickets = params.amount >= 14900 ? 4 : 1;
          setTicketsAdded(data.ticketsAdded || derivedTickets);
          if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
          // Re-set receipt amount from confirmed params (survives refresh via sessionStorage)
          setReceiptAmount(params.amount);
          setReceiptOrderId(params.orderId);
          try { sessionStorage.setItem("mamastale_receipt", JSON.stringify({ amount: params.amount, orderId: params.orderId })); } catch {}
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
        clearTimeout(timeoutId);
        if (!mounted) return;
        setStatus("error");
        setErrorMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });

    // R7-4: Cleanup on unmount
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
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

  // Auto-redirect countdown after success (5s → 0s → redirect)
  useEffect(() => {
    if (status !== "success") return;
    // Set flag so page.tsx auto-starts onboarding
    try { sessionStorage.setItem("mamastale_post_payment", "start"); } catch { /* ignore */ }

    // returnTo=teacher → 선생님 모드로 복귀
    const returnTo = searchParams.get("returnTo");

    const interval = setInterval(() => {
      setAutoRedirectCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          autoRedirectRef.current = null;
          if (returnTo === "teacher") {
            router.push("/teacher");
          } else {
            router.push("/library");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    autoRedirectRef.current = interval;
    return () => { clearInterval(interval); autoRedirectRef.current = null; };
  }, [status, hasSavedChat, router]);

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
              href="mailto:idrkdalswns@gmail.com"
              className="text-coral underline underline-offset-2"
            >
              idrkdalswns@gmail.com
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
    <div className="min-h-dvh bg-cream flex items-center justify-center px-6 py-10">
      <div
        className="w-full max-w-sm rounded-3xl p-7 text-center"
        style={{
          background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        }}
      >
        <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
          결제가 완료되었어요
        </h2>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-4 break-keep">
          티켓 <span className="text-coral font-semibold">{ticketsAdded}장</span> 구매가 완료되었어요.
        </p>

        {/* T-3: Receipt card */}
        <div
          className="rounded-xl p-4 mb-5 text-left"
          style={{ background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.1)" }}
        >
          <p className="text-[10px] text-brown-pale font-medium mb-2 text-center tracking-wider">영수증</p>
          <div className="space-y-1.5 text-[12px]">
            {receiptOrderId && (
              <div className="flex justify-between">
                <span className="text-brown-pale font-light">주문번호</span>
                <span className="text-brown font-medium text-[11px]">{(() => { const id = receiptOrderId.replace("order_", ""); return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id; })()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-brown-pale font-light">결제일시</span>
              <span className="text-brown font-medium">{receiptDate}</span>
            </div>
            {receiptAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-brown-pale font-light">결제금액</span>
                <span className="text-brown font-semibold">₩{receiptAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-brown-pale font-light">티켓 수량</span>
              <span className="text-coral font-semibold">{ticketsAdded}장</span>
            </div>
            {paymentMethod && PAYMENT_METHOD_LABELS[paymentMethod] && (
              <div className="flex justify-between">
                <span className="text-brown-pale font-light">결제수단</span>
                <span className="text-brown font-medium">{PAYMENT_METHOD_LABELS[paymentMethod].label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Freemium v2: Warm unlock message */}
        <div
          className="rounded-xl p-4 mb-4 text-center"
          style={{ background: "rgba(224,122,95,0.06)", border: "1px solid rgba(224,122,95,0.12)" }}
        >
          <p className="text-[13px] text-brown font-medium mb-1 break-keep">
            동화가 온전히 당신의 것이 되었어요.
          </p>
          <p className="text-[11px] text-brown-light font-light break-keep">
            티켓 {ticketsAdded}장으로 새로운 동화도 만들 수 있어요.
          </p>
        </div>

        {/* Referral card — post-payment promotion (moved up from bottom) */}
        <div className="mb-5">
          <p className="text-sm text-brown font-medium text-center mb-2">친구에게도 동화를 선물하세요</p>
          <ReferralCard />
        </div>

        <button
          onClick={() => {
            // Cancel auto-redirect when user clicks
            if (autoRedirectRef.current) { clearInterval(autoRedirectRef.current); autoRedirectRef.current = null; setAutoRedirectCount(0); }
            // Freemium v2: GA event for first purchase unlock
            window.gtag?.("event", "freemium_unlock_success", {
              tickets_added: ticketsAdded,
              amount: receiptAmount,
            });
            router.push("/library");
          }}
          className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          서재에서 동화 읽기
        </button>
        <button
          onClick={() => {
            if (autoRedirectRef.current) { clearInterval(autoRedirectRef.current); autoRedirectRef.current = null; setAutoRedirectCount(0); }
            router.push(hasSavedChat ? "/?action=start&payment=success" : "/?payment=success");
          }}
          className="w-full py-3 rounded-full text-sm font-medium text-brown-mid transition-all active:scale-[0.97] mb-2"
          style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
        >
          {hasSavedChat ? "대화 이어서 동화 만들기" : "새 동화 만들기"}
        </button>
        {autoRedirectCount > 0 && (
          <p className="text-[11px] text-brown-pale font-light mb-2">
            {autoRedirectCount}초 후 자동으로 이동합니다
          </p>
        )}
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
            className="w-full py-2.5 min-h-[44px] rounded-full text-sm font-medium text-brown-mid no-underline transition-all active:scale-[0.97]"
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
            className="w-full py-2.5 min-h-[44px] rounded-full text-sm font-medium text-brown-pale no-underline transition-all active:scale-[0.97]"
          >
            {shareCopied ? "✓ 링크가 복사되었어요" : "친구에게 공유하기"}
          </button>
        </div>

        {/* Referral card moved up to post-receipt position */}
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
