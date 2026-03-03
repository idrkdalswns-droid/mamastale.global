"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { AdBanner } from "@/components/ads/AdBanner";
import { useAuth } from "@/lib/hooks/useAuth";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (opts: { customerKey: string }) => {
        requestPayment: (params: {
          method: string;
          amount: { currency: string; value: number };
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
        }) => Promise<void>;
      };
    };
  }
}

export default function PricingPage() {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [error, setError] = useState("");
  const { user, loading: authLoading } = useAuth();
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const sdkLoadedRef = useRef(false);

  // Check if SDK loaded
  useEffect(() => {
    if (window.TossPayments) {
      setSdkReady(true);
      sdkLoadedRef.current = true;
    }
  }, []);

  const handleCheckout = async (priceType: "ticket" | "bundle") => {
    setError("");

    // Must be logged in to purchase
    if (!user) {
      setError("티켓을 구매하려면 로그인이 필요합니다.");
      return;
    }

    if (!tossClientKey) {
      setError("결제 시스템이 아직 설정되지 않았습니다.");
      return;
    }

    if (!sdkReady || !window.TossPayments) {
      setError("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setLoadingType(priceType);

    try {
      const amount = priceType === "bundle" ? 18900 : 4900;
      const orderName = priceType === "bundle" ? "동화 다섯 스토리 완성 티켓" : "동화 스토리 하나 완성 티켓";
      // JP-17: Non-enumerable order ID using crypto.randomUUID()
      const orderId = `order_${crypto.randomUUID()}`;

      const tossPayments = window.TossPayments(tossClientKey);
      const payment = tossPayments.payment({ customerKey: user.id });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      // User cancelled or error
      const errMsg = err instanceof Error ? err.message : "";
      if (!errMsg.includes("PAY_PROCESS_CANCELED")) {
        setError("결제 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-dvh bg-cream px-6 pt-12 pb-20 relative overflow-hidden">
      {/* Toss Payments SDK */}
      <Script
        src="https://js.tosspayments.com/v2/standard"
        strategy="afterInteractive"
        onLoad={() => {
          setSdkReady(true);
          sdkLoadedRef.current = true;
        }}
        onError={() => {
          setSdkError(true);
        }}
      />

      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={100} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] max-w-lg mx-auto">
        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-2xl font-bold text-brown no-underline">
            mamastale
          </Link>
          <h2 className="font-serif text-xl text-brown font-semibold mt-4 mb-2">
            요금 안내
          </h2>
          <p className="text-sm text-brown-light font-light leading-relaxed">
            첫 동화는 무료, 그 다음부터는<br />
            커피 한 잔 값으로 새로운 마음 동화를
          </p>
        </div>

        {/* SDK load error */}
        {sdkError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 text-center leading-relaxed">
              결제 창을 불러올 수 없습니다.<br />
              <strong>해결 방법:</strong> 브라우저 설정에서 콘텐츠 차단기(광고 차단)를 잠시 해제하거나,<br />
              Wi-Fi/데이터 연결을 확인한 뒤 페이지를 새로고침해 주세요.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 text-center">{error}</p>
            {!user && !authLoading && (
              <div className="text-center mt-2">
                <Link
                  href="/login"
                  className="text-xs text-coral font-medium no-underline"
                >
                  로그인하기 →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Free Trial */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(196,149,106,0.12)",
          }}
        >
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🫧</div>
            <h3 className="font-serif text-lg text-brown font-semibold">무료 체험</h3>
            <div className="flex items-baseline justify-center gap-0.5 mt-2">
              <span className="font-serif text-3xl font-bold text-brown">₩0</span>
            </div>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "첫 1회 완전한 동화 창작 체험",
              "4단계 마음 대화 (공감 → 질문 → 은유 → 동화)",
              "10장면 동화 완성",
              "PDF 다운로드",
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brown-light font-light">
                <span className="text-[10px] mt-1 text-mint-deep">●</span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href="/"
            className="block w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] text-center no-underline"
            style={{
              background: "transparent",
              color: "#7FBFB0",
              border: "1.5px solid rgba(127,191,176,0.4)",
            }}
          >
            무료로 시작하기
          </a>
        </div>

        {/* Ticket Model */}
        <div
          className="rounded-2xl p-5 mb-4 relative"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "2px solid #E07A5F",
          }}
        >
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] text-white font-medium tracking-wide"
            style={{ background: "#E07A5F" }}
          >
            가장 인기
          </div>

          <div className="text-center mb-4 pt-1">
            <div className="text-3xl mb-2">🎫</div>
            <h3 className="font-serif text-lg text-brown font-semibold">동화 스토리 하나 완성 티켓</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="font-serif text-3xl font-bold text-brown">₩4,900</span>
              <span className="text-sm text-brown-light font-light">/1권</span>
            </div>
            <p className="text-xs text-brown-pale mt-1">커피 한 잔 값으로 새로운 동화를</p>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "4단계 마음 대화 전 과정 1회",
              "새로운 상처, 새로운 은유, 새로운 동화",
              "10장면 동화 완성 + PDF 다운로드",
              "티켓은 소멸 기한 없음",
              "구독 부담 없이 원할 때만 결제",
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brown-light font-light">
                <span className="text-[10px] mt-1 text-coral">●</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleCheckout("ticket")}
            disabled={!!loadingType}
            className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {loadingType === "ticket" ? "결제 창 여는 중..." : "🎫 티켓 구매하기 · ₩4,900"}
          </button>
        </div>

        {/* Bundle Pack */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(109,76,145,0.15)",
          }}
        >
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-serif text-lg text-brown font-semibold">동화 다섯 스토리 완성 티켓</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="text-sm text-brown-pale font-light line-through mr-1">₩24,500</span>
              <span className="font-serif text-3xl font-bold text-brown">₩18,900</span>
              <span className="text-sm text-brown-light font-light">/5권</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                style={{ background: "#E07A5F" }}
              >
                23% OFF
              </span>
              <span className="text-xs text-coral font-medium">1권당 ₩3,780</span>
            </div>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "동화 5권 티켓 묶음",
              "다양한 주제로 시리즈 동화 제작",
              "가족·친구에게 선물 가능",
              "소멸 기한 없음",
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brown-light font-light">
                <span className="text-[10px] mt-1 text-purple">●</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleCheckout("bundle")}
            disabled={!!loadingType}
            className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
              boxShadow: "0 6px 20px rgba(109,76,145,0.25)",
            }}
          >
            {loadingType === "bundle" ? "결제 창 여는 중..." : "✨ 5권 묶음 구매 · ₩18,900"}
          </button>
        </div>

        {/* Why ticket model */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(196,149,106,0.08)",
          }}
        >
          <h3 className="font-serif text-sm font-semibold text-brown mb-3 text-center">
            왜 티켓 모델인가요?
          </h3>
          <div className="space-y-3">
            {[
              { emoji: "💰", text: "구독 부담 없이 필요할 때만 결제" },
              { emoji: "📖", text: "한 권 한 권이 완전한 마음 여정" },
              { emoji: "🎁", text: "소중한 사람에게 티켓 선물 가능" },
              { emoji: "♾️", text: "소멸 기한 없어서 여유롭게 사용" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{item.emoji}</span>
                <span className="text-xs text-brown-light font-light">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <AdBanner slot="pricing-bottom" format="horizontal" />

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-brown-mid font-light no-underline inline-flex items-center justify-center min-h-[44px] px-4">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
