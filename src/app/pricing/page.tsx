"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Script from "next/script";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

// ─── Toss Payments SDK v2 Type Declarations ───
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

// ─── Product Configuration ───
type PriceType = "ticket" | "bundle";

type PricingProduct = { name: string; amount: number; tickets: number };

const PRODUCTS: Record<PriceType, PricingProduct> = {
  ticket: {
    name: "동화 스토리 하나 완성 티켓",
    amount: 4900,
    tickets: 1,
  },
  bundle: {
    name: "동화 네 스토리 완성 티켓",
    amount: 14900,
    tickets: 4,
  },
};

const FIRST_PURCHASE_PRODUCT: PricingProduct = {
  name: "동화 스토리 하나 완성 티켓 (첫 구매 할인)",
  amount: 3920,
  tickets: 1,
};

// ─── Social Proof Reviews ───
const FEATURED_REVIEWS = [
  {
    name: "윤서맘",
    text: "사업하느라 아이에게 늘 미안한 마음이었는데, 대화를 통해 자연스럽게 풀렸어요. 딸이 \"엄마 이 동화 주인공이 엄마 같아!\"라며 안겨올 때 정말 울컥했습니다.",
    rating: 5,
  },
  {
    name: "현정맘",
    text: "처음엔 AI와 깊은 대화가 가능할까 반신반의했는데, 첫 질문부터 마음이 열렸어요. 15분 만에 울고 웃으며 동화까지 완성했습니다.",
    rating: 5,
  },
];

// ─── FAQ Data ───
const FAQS = [
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
    a: "모든 티켓 구매는 최종 확정이며, 환불이 불가합니다. 신중하게 결정해 주세요.",
  },
  {
    q: "어떤 결제 수단을 지원하나요?",
    a: "토스페이먼츠를 통해 신용카드 및 체크카드로 안전하게 결제할 수 있습니다.",
  },
];

function PricingContent() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: PriceType;
    amount: number;
    name: string;
  } | null>(null);

  const { user, loading: authLoading } = useAuth();
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  // Auto-detect first purchase eligibility
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        const supabase = createClient();
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        }
        const res = await fetch("/api/tickets", { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.isFirstPurchase) setIsFirstPurchase(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  // Check if SDK already loaded
  useEffect(() => {
    if (window.TossPayments) setSdkReady(true);
  }, []);

  // ─── Direct Redirect Payment ───
  const handlePayment = useCallback(
    async (productType: PriceType) => {
      if (isProcessing) return;

      if (!user && !authLoading) {
        window.location.href = "/login?redirect=/pricing";
        return;
      }

      if (!window.TossPayments || !tossClientKey || !user) {
        setError(
          "결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      setIsProcessing(true);
      setError("");

      try {
        const product =
          productType === "ticket" && isFirstPurchase
            ? FIRST_PURCHASE_PRODUCT
            : PRODUCTS[productType];
        const orderId = `order_${crypto.randomUUID()}`;

        const toss = window.TossPayments(tossClientKey);
        const payment = toss.payment({ customerKey: user.id });

        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: product.amount },
          orderId,
          orderName: product.name,
          successUrl: `${window.location.origin}/payment/success?mode=standard`,
          failUrl: `${window.location.origin}/payment/fail`,
        });
      } catch (err: unknown) {
        console.error("[TossPayments] requestPayment error:", err);
        const errObj = err as { code?: string; message?: string };
        const errCode = errObj?.code || "";
        const errMsg =
          errObj?.message || (err instanceof Error ? err.message : "");
        if (
          !errCode.includes("USER_CANCEL") &&
          !errCode.includes("PAY_PROCESS_CANCELED") &&
          !errMsg.includes("USER_CANCEL") &&
          !errMsg.includes("PAY_PROCESS_CANCELED")
        ) {
          setError(
            `결제 오류: ${errCode || errMsg || "알 수 없는 오류"}. 다시 시도해 주세요.`
          );
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, user, authLoading, tossClientKey, isFirstPurchase]
  );

  // Payment with confirmation step
  const initiatePayment = (productType: PriceType) => {
    if (!user && !authLoading) {
      window.location.href = "/login?redirect=/pricing";
      return;
    }
    const product =
      productType === "ticket" && isFirstPurchase
        ? FIRST_PURCHASE_PRODUCT
        : PRODUCTS[productType];
    setConfirmModal({
      type: productType,
      amount: product.amount,
      name: product.name,
    });
  };

  const confirmPayment = () => {
    if (!confirmModal) return;
    handlePayment(confirmModal.type);
    setConfirmModal(null);
  };

  return (
    <div className="min-h-dvh bg-cream relative overflow-hidden">
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

      <div className="relative z-[1] max-w-lg mx-auto px-6 pt-12 pb-28">
        {/* ════════════════════════════════════════
            HERO
            ════════════════════════════════════════ */}
        <section className="text-center mb-10" aria-label="요금 안내">
          <h1 className="font-serif text-2xl text-brown font-bold mb-3 leading-tight">
            아이를 위한
            <br />
            세상에 하나뿐인 동화
          </h1>
          <p className="text-sm text-brown-light font-light leading-relaxed break-keep">
            엄마의 마음 이야기가 AI 대화를 통해
            <br />
            세상에 단 하나뿐인 10장면 동화책이 됩니다
          </p>
        </section>

        {/* ════════════════════════════════════════
            VIDEO PREVIEW
            ════════════════════════════════════════ */}
        <section className="mb-10">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              aspectRatio: "16/9",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            }}
          >
            {videoLoaded ? (
              <iframe
                src="https://www.youtube.com/embed/S7Fs_Kvpr40?rel=0&autoplay=1"
                title="mamastale 완성 동화 미리보기"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setVideoLoaded(true)}
                className="w-full h-full flex flex-col items-center justify-center bg-brown/5 transition-colors hover:bg-brown/10 cursor-pointer"
                aria-label="동화 영상 재생하기"
              >
                <span className="w-14 h-14 rounded-full bg-coral/90 flex items-center justify-center mb-2" style={{ boxShadow: "0 4px 16px rgba(224,122,95,0.4)" }}>
                  <span className="ml-1 border-l-[14px] border-y-[9px] border-l-white border-y-transparent" />
                </span>
                <span className="text-[12px] text-brown-light font-light">영상으로 미리보기</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-brown-pale font-light text-center mt-2">
            실제 완성된 동화 영상 미리보기
          </p>
        </section>

        {/* ════════════════════════════════════════
            10-SCENE SAMPLE GALLERY
            ════════════════════════════════════════ */}
        <section className="mb-10">
          <h2 className="font-serif text-base text-brown font-semibold text-center mb-4">
            이런 동화가 만들어져요
          </h2>
          <div
            className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {[
              "엄마의 마음이 열리는 순간",
              "숲속에서 만난 작은 친구",
              "별빛 아래 속삭이는 이야기",
              "용기를 내어 한 걸음",
              "따뜻한 포옹의 기억",
              "비 오는 날의 약속",
              "무지개 너머의 꿈",
              "함께 걷는 길",
              "마음의 씨앗이 피어나다",
              "세상에 하나뿐인 우리 이야기",
            ].map((title, i) => (
              <div
                key={i}
                className="flex-shrink-0 snap-center rounded-xl overflow-hidden"
                style={{
                  width: "200px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <img
                  src={`/images/sample/scene-${String(i + 1).padStart(2, "0")}.jpg`}
                  alt={`동화 장면 ${i + 1}: ${title}`}
                  width={200}
                  height={150}
                  className="w-full aspect-[4/3] object-cover"
                  loading="lazy"
                />
                <div className="px-3 py-2 bg-white/80">
                  <p className="text-[11px] text-brown font-medium leading-tight">
                    {title}
                  </p>
                  <p className="text-[9px] text-brown-pale font-light mt-0.5">
                    {i + 1}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════
            SOCIAL PROOF
            ════════════════════════════════════════ */}
        <section className="text-center mb-10">
          <div className="flex items-center justify-center gap-6 mb-5">
            <div>
              <p className="text-2xl font-bold text-brown font-serif">4.8</p>
              <p className="text-[11px] text-brown-light font-light">
                평균 만족도
              </p>
            </div>
            <div className="w-px h-8 bg-brown-pale/20" />
            <div>
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                {Array.from({ length: 5 }, (_, j) => (
                  <span
                    key={j}
                    className="text-sm"
                    style={{ color: "#E07A5F" }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-brown-light font-light">
                5.0 만점
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {FEATURED_REVIEWS.map((r, i) => (
              <div
                key={i}
                className="rounded-xl p-4 text-left"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(196,149,106,0.1)",
                }}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: 5 }, (_, j) => (
                    <span
                      key={j}
                      className="text-[11px]"
                      style={{
                        color: j < r.rating ? "#E07A5F" : "#D5C4B0",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-brown font-light leading-relaxed break-keep">
                  &ldquo;{r.text}&rdquo;
                </p>
                <p className="text-[11px] text-brown-pale font-light mt-1.5">
                  — {r.name}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/reviews"
            className="inline-block text-xs text-coral font-medium no-underline mt-3"
          >
            후기 더 보기 →
          </Link>
        </section>

        {/* ════════════════════════════════════════
            PAYMENT BADGE
            ════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <span
            className="px-3 py-1 rounded-full text-[10px] text-brown-mid font-medium"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            토스페이먼츠 안전 결제
          </span>
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

        {!sdkReady && !sdkError && (
          <p className="text-xs text-brown-pale text-center mb-2 animate-pulse">
            결제 시스템을 불러오는 중...
          </p>
        )}

        {/* ════════════════════════════════════════
            BUNDLE (₩14,900) — PRIMARY · Claymorphism
            ════════════════════════════════════════ */}
        <div
          className="rounded-3xl p-6 mb-5 relative"
          style={{
            background: "rgba(255,255,255,0.7)",
            boxShadow:
              "8px 8px 20px rgba(0,0,0,0.06), -4px -4px 12px rgba(255,255,255,0.8), inset 0 0 0 1px rgba(255,255,255,0.5)",
            border: "2px solid rgba(109,76,145,0.2)",
          }}
        >
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] text-white font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
            }}
          >
            가장 인기
          </div>

          <div className="text-center mb-5 pt-2">
            <h3 className="font-serif text-lg text-brown font-semibold">
              4일 연속 대화 프로그램
            </h3>
            <p className="text-xs text-brown-light font-light mt-1.5 leading-relaxed break-keep">
              4일 연속 대화하면, 마음이 한결 가벼워집니다
              <br />— 펜네베이커 교수 40년 연구 입증
            </p>
            <div className="flex items-baseline justify-center gap-1 mt-3">
              <span className="text-sm text-brown-pale font-light line-through mr-1">
                ₩19,600
              </span>
              <span className="font-serif text-3xl font-bold text-brown">
                ₩14,900
              </span>
              <span className="text-sm text-brown-light font-light">/4권</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                style={{ background: "#E07A5F" }}
              >
                24% OFF
              </span>
              <span className="text-xs text-coral font-medium">
                1권당 ₩3,725
              </span>
            </div>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "매일 15~20분, 마음속 이야기를 꺼내는 시간",
              "서로 다른 감정으로 서로 다른 동화 4편 완성",
              "완성된 동화는 영구 보관 + PDF 다운로드",
              "30일간 여유롭게 사용 가능",
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
            onClick={() => initiatePayment("bundle")}
            disabled={isProcessing || !sdkReady}
            className="w-full py-4 rounded-full text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
              boxShadow: "0 6px 20px rgba(109,76,145,0.3)",
            }}
          >
            {isProcessing
              ? "결제 페이지로 이동 중..."
              : "4일 프로그램 시작하기"}
          </button>
          <p className="text-[11px] text-center text-brown-pale font-light mt-1.5">
            ₩14,900 · 1권당 ₩3,725
          </p>
        </div>

        {/* ════════════════════════════════════════
            SINGLE TICKET (₩4,900) — SECONDARY
            ════════════════════════════════════════ */}
        <div
          className={`rounded-2xl p-5 mb-6 relative ${isFirstPurchase ? "pt-6" : ""}`}
          style={{
            background: "rgba(255,255,255,0.6)",
            border: `1.5px solid ${isFirstPurchase ? "#E07A5F" : "rgba(224,122,95,0.15)"}`,
          }}
        >
          {isFirstPurchase && (
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] text-white font-bold"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              }}
            >
              첫 구매 20% 할인
            </div>
          )}

          <div className="text-center mb-4">
            <h3 className="font-serif text-base text-brown font-semibold">
              동화 한 편 완성
            </h3>
            <p className="text-xs text-brown-light font-light mt-1 break-keep">
              15분 뒤, 아이가 매일 밤 읽어달라는 동화가 생깁니다
            </p>
            {isFirstPurchase ? (
              <div className="flex items-baseline justify-center gap-2 mt-2">
                <span className="text-sm text-brown-pale line-through">
                  ₩4,900
                </span>
                <span className="font-serif text-2xl font-bold text-brown">
                  ₩3,920
                </span>
                <span className="text-sm text-brown-light font-light">
                  /1권
                </span>
              </div>
            ) : (
              <div className="flex items-baseline justify-center gap-1 mt-2">
                <span className="font-serif text-2xl font-bold text-brown">
                  ₩4,900
                </span>
                <span className="text-sm text-brown-light font-light">
                  /1권
                </span>
              </div>
            )}
          </div>

          <ul className="space-y-2 mb-4">
            {[
              "4단계 마음 대화 + 10장면 동화 완성",
              "PDF 다운로드 + 영구 보관",
              "30일간 여유롭게 사용 가능",
            ].map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-brown-light font-light"
              >
                <span className="text-[10px] mt-0.5 text-coral">●</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => initiatePayment("ticket")}
            disabled={isProcessing || !sdkReady}
            className="w-full py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
            }}
          >
            {isProcessing
              ? "결제 페이지로 이동 중..."
              : isFirstPurchase
                ? "첫 동화 만들기"
                : "동화 한 편 만들기"}
          </button>
          <p className="text-[11px] text-center text-brown-pale font-light mt-1.5">
            {isFirstPurchase ? "₩3,920 (20% 할인)" : "₩4,900"}
          </p>
        </div>

        {/* ════════════════════════════════════════
            TRUST BADGES
            ════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-3 mb-8 text-[10px] text-brown-pale font-light">
          <span>토스페이먼츠 안전 결제</span>
          <span>·</span>
          <span>전자영수증 발급</span>
          <span>·</span>
          <span>개인정보 보호</span>
        </div>

        {/* ════════════════════════════════════════
            WHY TICKET MODEL
            ════════════════════════════════════════ */}
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
              "구독 부담 없이 필요할 때만 결제",
              "한 권 한 권이 완전한 마음 여정",
              "소중한 사람에게 티켓 선물 가능",
              "구매 후 30일 이내 여유롭게 사용",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] text-brown-pale flex-shrink-0">
                  ●
                </span>
                <span className="text-xs text-brown-light font-light">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════
            FAQ — with aria-expanded / aria-controls
            ════════════════════════════════════════ */}
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
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-brown-pale/10 rounded-xl overflow-hidden"
              >
                <button
                  id={`faq-btn-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[44px]"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-panel-${i}`}
                >
                  <span className="text-xs text-brown font-medium">
                    {faq.q}
                  </span>
                  <span className="text-xs text-brown-pale ml-2 flex-shrink-0">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    className="px-4 pb-3"
                  >
                    <p className="text-[11px] text-brown-light font-light leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SAFETY NOTICE
            ════════════════════════════════════════ */}
        <div
          className="rounded-2xl p-4 mb-6 text-center"
          style={{
            background: "rgba(127,191,176,0.06)",
            border: "1px solid rgba(127,191,176,0.12)",
          }}
        >
          <p className="text-[11px] text-brown-light font-light leading-relaxed">
            이 서비스는 전문 심리 상담을 대체하지 않습니다.
            <br />
            심리적 위기 시 1393 (자살예방상담전화) 또는 109
            (정신건강위기상담전화)
          </p>
        </div>

        {/* Contact */}
        <div className="text-center mb-4">
          <p className="text-[10px] text-brown-pale font-light leading-relaxed">
            문의: kang.minjune@icloud.com
          </p>
        </div>

      </div>

      {/* ════════════════════════════════════════
          STICKY BOTTOM CTA (mobile conversion boost)
          ════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,6px)+6px)] pt-3"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgb(var(--cream)) 25%)",
        }}
      >
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={() => initiatePayment("bundle")}
            disabled={isProcessing || !sdkReady}
            className="flex-[2] py-3 rounded-full text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
              boxShadow: "0 4px 16px rgba(109,76,145,0.3)",
            }}
          >
            4일 프로그램 · ₩14,900
          </button>
          <button
            onClick={() => initiatePayment("ticket")}
            disabled={isProcessing || !sdkReady}
            className="flex-1 py-3 rounded-full text-[13px] font-medium text-coral transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1.5px solid rgba(224,122,95,0.3)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            {isFirstPurchase ? "1편 · ₩3,920" : "1편 · ₩4,900"}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          PAYMENT CONFIRMATION MODAL
          ════════════════════════════════════════ */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="결제 확인"
          style={{
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmModal(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirmModal(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-[90%] mx-4 animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
          >
            <h3 className="font-serif text-lg text-brown font-semibold text-center mb-2">
              결제 확인
            </h3>
            <p className="text-sm text-brown-light text-center mb-1">
              {confirmModal.name}
            </p>
            <p className="text-2xl font-bold text-brown text-center font-serif mb-4">
              ₩{confirmModal.amount.toLocaleString()}
            </p>
            <p className="text-[11px] text-brown-pale font-light text-center mb-5 leading-relaxed">
              동화를 완성한 어머니들이<br />
              <span className="text-coral font-medium">&ldquo;아이가 매일 읽어달라고 해요&rdquo;</span>라고 전해주셨어요
            </p>
            <button
              onClick={confirmPayment}
              className="w-full py-3.5 rounded-full text-sm font-bold text-white transition-all active:scale-[0.97] mb-2"
              style={{
                background:
                  confirmModal.type === "bundle"
                    ? "linear-gradient(135deg, #6D4C91, #8B6FB0)"
                    : "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.25)",
              }}
            >
              결제하기
            </button>
            <button
              onClick={() => setConfirmModal(null)}
              className="w-full py-2.5 min-h-[44px] text-[12px] font-light text-brown-pale transition-all active:scale-[0.97]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-cream flex items-center justify-center">
          <div className="text-sm text-brown-pale animate-pulse">
            Loading...
          </div>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
