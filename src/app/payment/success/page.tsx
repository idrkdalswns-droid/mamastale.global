"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"confirming" | "success" | "error">("confirming");
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketsAdded, setTicketsAdded] = useState(0);
  const confirmedRef = useRef(false);

  useEffect(() => {
    // Idempotency guard: prevent double-confirm on re-render or refresh
    if (confirmedRef.current) return;

    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    // Mark as confirmed and clean URL BEFORE the fetch to prevent race
    confirmedRef.current = true;
    window.history.replaceState({}, "", "/payment/success");

    // Confirm payment with backend
    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setTicketsAdded(data.ticketsAdded || 1);
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(data.error || "결제 확인에 실패했습니다.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("네트워크 오류가 발생했습니다.");
      });
  }, [searchParams]);

  if (status === "confirming") {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center">
          <div className="text-[56px] mb-4 animate-pulse">💳</div>
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

  if (status === "error") {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center">
          <div className="text-[56px] mb-4">😕</div>
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
        <div className="text-[56px] mb-4">🌷</div>
        <h2 className="font-serif text-xl font-bold text-brown mb-3 leading-tight">
          감사합니다, 어머니
        </h2>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-2 break-keep">
          티켓 <span className="text-coral font-semibold">{ticketsAdded}장</span> 구매가 완료되었어요.
        </p>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
          이제 아이를 위한 아름다운<br />
          <span className="text-coral font-medium">세상에 하나뿐인 마음 동화</span>를<br />
          만들어 볼까요?
        </p>
        <button
          onClick={() => router.push("/?payment=success")}
          className="w-full py-3.5 rounded-full text-white text-sm font-medium transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          지금 바로 동화 만들기
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 rounded-full text-sm font-light text-brown-pale transition-all"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-cream flex items-center justify-center">
          <div className="text-3xl animate-pulse">💳</div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
