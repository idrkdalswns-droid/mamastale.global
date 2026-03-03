"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Script from "next/script";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { AdBanner } from "@/components/ads/AdBanner";
import { useAuth } from "@/lib/hooks/useAuth";

// ─── Toss Payment Widget SDK v2 Type Declarations ───
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      widgets: (opts: { customerKey: string }) => TossWidgets;
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

interface TossWidgets {
  setAmount: (amount: { currency: string; value: number }) => Promise<void>;
  renderPaymentMethods: (opts: {
    selector: string;
    variantKey?: string;
  }) => Promise<void>;
  renderAgreement: (opts: {
    selector: string;
    variantKey?: string;
  }) => Promise<void>;
  requestPayment: (params: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }) => Promise<void>;
}

// ─── Product Configuration ───
type PriceType = "ticket" | "bundle";

const PRODUCTS: Record<
  PriceType,
  { name: string; amount: number; tickets: number }
> = {
  ticket: {
    name: "동화 스토리 하나 완성 티켓",
    amount: 4900,
    tickets: 1,
  },
  bundle: {
    name: "동화 다섯 스토리 완성 티켓",
    amount: 18900,
    tickets: 5,
  },
};

export default function PricingPage() {
  const [selectedProduct, setSelectedProduct] = useState<PriceType | null>(
    null
  );
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();

  const widgetsRef = useRef<TossWidgets | null>(null);
  const widgetInitProductRef = useRef<PriceType | null>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // ─── Keys ───
  const tossWidgetKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_KEY;
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const useWidgetMode = !!tossWidgetKey;

  // Check if SDK already loaded (e.g., from cache)
  useEffect(() => {
    if (window.TossPayments) setSdkReady(true);
  }, []);

  // ─── Widget Init / Amount Update ───
  useEffect(() => {
    if (!selectedProduct || !sdkReady || !window.TossPayments || !user) return;
    if (!useWidgetMode) return;

    const product = PRODUCTS[selectedProduct];

    // Widget already initialized → just update amount
    if (widgetsRef.current && widgetInitProductRef.current !== null) {
      widgetInitProductRef.current = selectedProduct;
      widgetsRef.current
        .setAmount({ currency: "KRW", value: product.amount })
        .catch(() => setError("결제 금액 변경에 실패했습니다."));
      return;
    }

    // First initialization
    widgetInitProductRef.current = selectedProduct;
    setWidgetLoading(true);
    setWidgetReady(false);

    const initWidget = async () => {
      try {
        const toss = window.TossPayments!(tossWidgetKey!);
        const widgets = toss.widgets({ customerKey: user.id });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: "KRW", value: product.amount });
        await widgets.renderPaymentMethods({
          selector: "#payment-methods",
        });
        await widgets.renderAgreement({
          selector: "#agreement",
        });

        setWidgetReady(true);
      } catch (err) {
        console.error("Widget init error:", err);
        setError(
          "결제 위젯을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."
        );
      } finally {
        setWidgetLoading(false);
      }
    };

    initWidget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, sdkReady, user?.id, useWidgetMode]);

  // ─── Select Product ───
  const handleSelectProduct = useCallback(
    (type: PriceType) => {
      setError("");

      // Must be logged in
      if (!user && !authLoading) {
        window.location.href = "/login?redirect=/pricing";
        return;
      }

      setSelectedProduct(type);

      // Scroll to checkout section
      setTimeout(() => {
        checkoutRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    },
    [user, authLoading]
  );

  // ─── Widget Mode: requestPayment ───
  const handleWidgetPayment = useCallback(async () => {
    if (!widgetsRef.current || !selectedProduct || isProcessing) return;
    setIsProcessing(true);
    setError("");

    try {
      const product = PRODUCTS[selectedProduct];
      const orderId = `order_${crypto.randomUUID()}`;

      await widgetsRef.current.requestPayment({
        orderId,
        orderName: product.name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      if (
        !errMsg.includes("USER_CANCEL") &&
        !errMsg.includes("PAY_PROCESS_CANCELED")
      ) {
        setError("결제 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedProduct, isProcessing]);

  // ─── Standard Mode Fallback: card-only popup ───
  const handleStandardPayment = useCallback(async () => {
    if (
      !selectedProduct ||
      isProcessing ||
      !window.TossPayments ||
      !tossClientKey ||
      !user
    )
      return;
    setIsProcessing(true);
    setError("");

    try {
      const product = PRODUCTS[selectedProduct];
      const orderId = `order_${crypto.randomUUID()}`;

      const toss = window.TossPayments(tossClientKey);
      const payment = toss.payment({ customerKey: user.id });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: product.amount },
        orderId,
        orderName: product.name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      if (!errMsg.includes("PAY_PROCESS_CANCELED")) {
        setError("결제 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedProduct, isProcessing, tossClientKey, user]);

  return (
    <div className="min-h-dvh bg-cream px-6 pt-12 pb-20 relative overflow-hidden">
      {/* Toss Payments SDK v2 */}
      <Script
        src="https://js.tosspayments.com/v2/standard"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() => setSdkError(true)}
      />

      <WatercolorBlob
        top={-60}
        right={-80}
        size={220}
        color="rgba(232,168,124,0.06)"
      />
      <WatercolorBlob
        bottom={100}
        left={-60}
        size={200}
        color="rgba(184,216,208,0.07)"
      />

      <div className="relative z-[1] max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-brown no-underline"
          >
            mamastale
          </Link>
          <h2 className="font-serif text-xl text-brown font-semibold mt-4 mb-2">
            마음 동화, 지금 시작하세요
          </h2>
          <p className="text-sm text-brown-light font-light leading-relaxed">
            첫 동화는 무료, 그 다음부터는
            <br />
            커피 한 잔 값으로 아이가 매일 읽는 동화를
          </p>
        </div>

        {/* Payment method badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
          {[
            { icon: "💳", label: "카드" },
            { icon: "🟡", label: "카카오페이" },
            { icon: "🟢", label: "네이버페이" },
            { icon: "🔵", label: "토스페이" },
          ].map((m, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[10px] text-brown-mid font-medium"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {m.icon} {m.label}
            </span>
          ))}
        </div>

        {/* SDK load error */}
        {sdkError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 text-center leading-relaxed">
              결제 창을 불러올 수 없습니다.
              <br />
              <strong>해결 방법:</strong> 브라우저 설정에서 콘텐츠 차단기(광고
              차단)를 잠시 해제하거나,
              <br />
              Wi-Fi/데이터 연결을 확인한 뒤 페이지를 새로고침해 주세요.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            Free Trial Card
            ════════════════════════════════════════════════ */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(196,149,106,0.12)",
          }}
        >
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🫧</div>
            <h3 className="font-serif text-lg text-brown font-semibold">
              무료 체험
            </h3>
            <div className="flex items-baseline justify-center gap-0.5 mt-2">
              <span className="font-serif text-3xl font-bold text-brown">
                ₩0
              </span>
            </div>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "첫 1회 완전한 동화 창작 체험",
              "4단계 마음 대화 (공감 → 질문 → 은유 → 동화)",
              "10장면 동화 완성",
              "PDF 다운로드",
            ].map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-brown-light font-light"
              >
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

        {/* ════════════════════════════════════════════════
            Ticket (₩4,900) Card
            ════════════════════════════════════════════════ */}
        <div
          className={`rounded-2xl p-5 mb-4 relative transition-all duration-300 ${
            selectedProduct === "ticket"
              ? "ring-2 ring-coral ring-offset-2 ring-offset-cream"
              : ""
          }`}
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "2px solid #E07A5F",
          }}
        >
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] text-white font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            }}
          >
            ✨ 가장 인기
          </div>

          <div className="text-center mb-4 pt-1">
            <div className="text-3xl mb-2">🎫</div>
            <h3 className="font-serif text-lg text-brown font-semibold">
              동화 스토리 하나 완성 티켓
            </h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="font-serif text-3xl font-bold text-brown">
                ₩4,900
              </span>
              <span className="text-sm text-brown-light font-light">/1권</span>
            </div>
            <p className="text-xs text-brown-pale mt-1">
              커피 한 잔 값으로 새로운 동화를
            </p>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "4단계 마음 대화 전 과정 1회",
              "새로운 상처, 새로운 은유, 새로운 동화",
              "10장면 동화 완성 + PDF 다운로드",
              "티켓은 소멸 기한 없음",
              "구독 부담 없이 원할 때만 결제",
            ].map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-brown-light font-light"
              >
                <span className="text-[10px] mt-1 text-coral">●</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSelectProduct("ticket")}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background:
                selectedProduct === "ticket"
                  ? "linear-gradient(135deg, #C96B52, #B85A43)"
                  : "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {selectedProduct === "ticket"
              ? "✓ 선택됨 · 아래에서 결제하기"
              : "🎫 티켓 구매하기 · ₩4,900"}
          </button>
        </div>

        {/* ════════════════════════════════════════════════
            Bundle (₩18,900) Card
            ════════════════════════════════════════════════ */}
        <div
          className={`rounded-2xl p-5 mb-4 relative transition-all duration-300 ${
            selectedProduct === "bundle"
              ? "ring-2 ring-purple ring-offset-2 ring-offset-cream"
              : ""
          }`}
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(109,76,145,0.15)",
          }}
        >
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] text-white font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
            }}
          >
            🏆 Best Value
          </div>
          <div className="text-center mb-4 pt-1">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-serif text-lg text-brown font-semibold">
              동화 다섯 스토리 완성 티켓
            </h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="text-sm text-brown-pale font-light line-through mr-1">
                ₩24,500
              </span>
              <span className="font-serif text-3xl font-bold text-brown">
                ₩18,900
              </span>
              <span className="text-sm text-brown-light font-light">/5권</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                style={{ background: "#E07A5F" }}
              >
                23% OFF
              </span>
              <span className="text-xs text-coral font-medium">
                1권당 ₩3,780
              </span>
            </div>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "동화 5권 티켓 묶음",
              "다양한 주제로 시리즈 동화 제작",
              "가족·친구에게 선물 가능",
              "소멸 기한 없음",
            ].map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-brown-light font-light"
              >
                <span className="text-[10px] mt-1 text-purple">●</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSelectProduct("bundle")}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background:
                selectedProduct === "bundle"
                  ? "linear-gradient(135deg, #5C3F7E, #6D4C91)"
                  : "linear-gradient(135deg, #6D4C91, #8B6FB0)",
              boxShadow: "0 6px 20px rgba(109,76,145,0.25)",
            }}
          >
            {selectedProduct === "bundle"
              ? "✓ 선택됨 · 아래에서 결제하기"
              : "✨ 5권 묶음 구매 · ₩18,900"}
          </button>
        </div>

        {/* ════════════════════════════════════════════════
            Checkout Section — Payment Widget
            ════════════════════════════════════════════════ */}
        {selectedProduct && (
          <div
            ref={checkoutRef}
            className="rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              background: "linear-gradient(180deg, #FFFFFF, #FFF9F5)",
              border: "2px solid rgba(224,122,95,0.2)",
              boxShadow: "0 8px 32px rgba(224,122,95,0.08)",
            }}
          >
            {/* Product summary bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brown-pale/10">
              <div>
                <p className="text-sm font-medium text-brown">
                  {PRODUCTS[selectedProduct].name}
                </p>
                <p className="text-[11px] text-brown-pale font-light mt-0.5">
                  {selectedProduct === "bundle"
                    ? "5권 묶음 · 23% 할인"
                    : "1권"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-lg font-bold text-brown">
                  ₩{PRODUCTS[selectedProduct].amount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Change product link */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => {
                  const other =
                    selectedProduct === "ticket" ? "bundle" : "ticket";
                  handleSelectProduct(other);
                }}
                className="text-[11px] text-coral font-medium"
              >
                {selectedProduct === "ticket"
                  ? "5권 묶음으로 변경 (23% 할인) →"
                  : "1권 단품으로 변경 →"}
              </button>
            </div>

            {/* Widget Mode: Embedded Payment UI */}
            {useWidgetMode ? (
              <>
                {/* Widget loading spinner */}
                {widgetLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="text-3xl animate-pulse mb-2">💳</div>
                      <p className="text-xs text-brown-pale font-light">
                        결제 수단 불러오는 중...
                      </p>
                    </div>
                  </div>
                )}

                {/* Toss Payment Methods Widget — renders here */}
                <div
                  id="payment-methods"
                  className="mb-3"
                  style={{
                    minHeight: widgetLoading ? 0 : 200,
                    display: widgetLoading ? "none" : "block",
                  }}
                />

                {/* Toss Agreement Widget — renders here */}
                <div
                  id="agreement"
                  className="mb-4"
                  style={{ display: widgetLoading ? "none" : "block" }}
                />

                {/* Pay button */}
                <button
                  onClick={handleWidgetPayment}
                  disabled={!widgetReady || isProcessing}
                  className="w-full py-4 rounded-full text-white text-[15px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
                  }}
                >
                  {isProcessing
                    ? "결제 진행 중..."
                    : `₩${PRODUCTS[selectedProduct].amount.toLocaleString()} 결제하기`}
                </button>
              </>
            ) : (
              /* Standard Mode Fallback: Card-only popup */
              <>
                <div className="text-center py-6">
                  <p className="text-sm text-brown-light font-light mb-1">
                    카드 결제로 진행됩니다
                  </p>
                  <p className="text-[10px] text-brown-pale font-light">
                    사업자등록 완료 후 카카오페이·네이버페이·토스페이도 사용
                    가능해요
                  </p>
                </div>

                <button
                  onClick={handleStandardPayment}
                  disabled={!sdkReady || isProcessing}
                  className="w-full py-4 rounded-full text-white text-[15px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 8px 28px rgba(224,122,95,0.35)",
                  }}
                >
                  {isProcessing
                    ? "결제 창 여는 중..."
                    : `💳 카드로 ₩${PRODUCTS[selectedProduct].amount.toLocaleString()} 결제하기`}
                </button>
              </>
            )}

            {/* Security badges */}
            <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-brown-pale font-light">
              <span>🔒 안전 결제</span>
              <span>📄 전자영수증 발급</span>
              <span>🔄 7일 환불</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            Why Ticket Model
            ════════════════════════════════════════════════ */}
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
                <span className="text-xs text-brown-light font-light">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            FAQ Section
            ════════════════════════════════════════════════ */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(196,149,106,0.08)",
          }}
        >
          <h3 className="font-serif text-sm font-semibold text-brown mb-3 text-center">
            자주 묻는 질문
          </h3>
          <div className="space-y-2">
            {[
              {
                q: "티켓은 어떻게 사용하나요?",
                a: "티켓 1장으로 4단계 마음 대화를 진행하고, 10장면 동화 1편을 완성할 수 있어요. 동화 완성 시 티켓이 차감됩니다.",
              },
              {
                q: "만든 동화는 영구 보관되나요?",
                a: "네, 완성된 동화는 '내 서재'에 영구 보관됩니다. 언제든 PDF로 다운로드하거나 공유할 수 있어요.",
              },
              {
                q: "환불은 가능한가요?",
                a: "미사용 티켓은 구매일로부터 7일 이내에 환불 가능합니다. 고객센터(support@mamastale.com)로 문의해 주세요.",
              },
              {
                q: "카카오페이, 네이버페이로 결제 가능한가요?",
                a: "네! 카드 결제는 물론, 카카오페이·네이버페이·토스페이 등 다양한 결제 수단을 지원합니다.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="border border-brown-pale/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs text-brown font-medium">
                    {faq.q}
                  </span>
                  <span className="text-xs text-brown-pale ml-2 flex-shrink-0">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-brown-light font-light leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Refund & Trust */}
        <div className="text-center mb-4">
          <p className="text-[10px] text-brown-pale font-light leading-relaxed">
            미사용 티켓 7일 이내 환불 가능 · 문의: support@mamastale.com
          </p>
        </div>

        <AdBanner slot="pricing-bottom" format="horizontal" />

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-brown-mid font-light no-underline inline-flex items-center justify-center min-h-[44px] px-4"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
