"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { useAuth } from "@/lib/hooks/useAuth";
import { trackBeginCheckout, trackPaymentStart, trackPricingPageView, trackPricingCtaClick, trackPricingModalOpen, trackPricingModalConfirm, trackPricingModalCancel } from "@/lib/utils/analytics";
import { hapticMedium } from "@/lib/utils/haptic";
// SectionTabBar and page nav tab bar removed — GlobalNav already provides page navigation

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
type PriceType = "ticket" | "bundle" | "worksheet_single" | "worksheet_bundle";

type PricingProduct = { name: string; amount: number; tickets: number };

const PRODUCTS: Record<PriceType, PricingProduct> = {
  ticket: {
    name: "동화 한 편 만들기",
    amount: 3920,
    tickets: 1,
  },
  bundle: {
    name: "4일 연속 대화 프로그램 (4편)",
    amount: 14900,
    tickets: 4,
  },
  worksheet_single: {
    name: "활동지 1건",
    amount: 1900,
    tickets: 1,
  },
  worksheet_bundle: {
    name: "활동지 5건 묶음",
    amount: 7600,
    tickets: 5,
  },
};

// ─── Social Proof Reviews ───
const FEATURED_REVIEWS = [
  {
    name: "윤서맘",
    text: "사업하느라 아이에게 늘 미안한 마음이었는데, 대화를 통해 자연스럽게 풀렸어요. 딸이 \"엄마 이 동화 주인공이 엄마 같아!\"라며 안겨올 때 정말 울컥했습니다.",
    rating: 5,
    date: "2025.02",
  },
  {
    name: "현정맘",
    text: "처음엔 AI와 깊은 대화가 가능할까 반신반의했는데, 첫 질문부터 마음이 열렸어요. 15분 만에 울고 웃으며 동화까지 완성했습니다.",
    rating: 5,
    date: "2025.03",
  },
];

// ─── FAQ Data ───
const FAQS = [
  {
    q: "어떻게 사용하나요?",
    a: "1회 구매로 4단계 마음 대화를 진행하고, 10장면 동화 1편을 완성할 수 있어요. 동화 완성 시 1회가 차감됩니다.",
  },
  {
    q: "만든 동화는 영구 보관되나요?",
    a: "네, 완성된 동화는 '내 서재'에 영구 보관됩니다. 언제든 PDF로 다운로드하거나 공유할 수 있어요.",
  },
  {
    q: "환불은 가능한가요?",
    a: "미사용 티켓은 고객센터를 통해 환불이 가능합니다. 자세한 사항은 이용약관 제9조를 확인해 주세요.",
  },
  {
    q: "어떤 결제 수단을 지원하나요?",
    a: "토스페이먼츠를 통해 신용카드, 체크카드, 카카오페이, 네이버페이, 토스페이 등 다양한 결제 수단을 지원합니다.",
  },
];

// STORY_COUNT is now fetched dynamically inside PricingContent

// ─── Gallery Scene Texts (hoisted to avoid re-allocation per render) ───
const GALLERY_SCENES = [
  "안녕? 오늘은 자전거를 아주아주 좋아하는 '민준 삼촌'이 동유럽 열 개 나라를 여행하는 엄청난 모험을 떠난 이야기야!",
  "삼촌의 배낭 속에는 침대 대신 작은 '노란색 텐트'가 들어있었어. 두 달 동안 낮에는 쌩쌩 페달을 밟고, 밤에는 하늘을 이불 삼아 쿨쿨 잠드는 멋진 캠핑이었단다.",
  "그러던 어느 캄캄한 밤, 달님도 숨고 바람 소리조차 들리지 않는 숲속에 삼촌 혼자 덩그러니 남겨졌어. 그때, 텐트 안으로 '외로움'이라는 커다란 회색 그림자 괴물이 스멀스멀 찾아왔지.",
  "괴물은 삼촌의 마음을 꽁꽁 얼어붙게 만들었어. \"너무 춥고 무서워...\" 삼촌은 무릎을 꼭 끌어안고 덜덜 떨었지.",
  "'이대로 질 수는 없어!' 삼촌은 용기를 내어 가방 깊은 곳에서 하얀 빈 공책 한 권과 뾰족한 몽당연필을 찾아냈어.",
  "삼촌은 엎드려 하얀 종이 위에 마음을 담아 글쓰기를 시작했어. \"나는 지금 혼자 있어서 너무 외로워.\" 꽁꽁 숨겨둔 진짜 마음을 종이에게 솔직하게 들려주었단다.",
  "그런데 놀라운 일이 벌어졌어! 글자들이 반짝반짝 빛나는 '글자 요정'으로 변하더니, 춤을 추며 삼촌의 얼어붙은 마음을 따뜻하게 안아주었어.",
  "글을 쓸수록 캄캄했던 텐트 안은 아름다운 마법의 세계로 변해갔어. 눈부신 빛에 깜짝 놀란 외로움 괴물은 \"으악!\" 소리를 치며 저 멀리 도망쳐 버렸단다.",
  "한국으로 돌아온 삼촌은, 매일 우리를 돌보느라 지친 엄마들의 등 뒤에도 그 외로움 괴물이 매달려 있는 걸 보았어. 속상한 마음을 털어놓지 못하는 엄마들이 너무 많았지.",
  "\"이 반짝이는 글쓰기 마법을 엄마들에게도 선물해야겠다!\" 그렇게 삼촌의 따뜻한 마음이 모여, 엄마가 적은 글이 아이에게 들려줄 동화로 변하는 마법 서재 '마마스테일'이 태어났단다.",
];

const TARGET_AUDIENCE = [
  "구독 부담 없이 필요할 때만 쓰고 싶은 분",
  "오늘의 마음을 한 권의 동화로 완성하고 싶은 분",
  "소중한 사람에게 동화를 선물하고 싶은 분",
  "아이에게 매일 밤 읽어줄 동화가 필요한 분",
];

// ─── Gallery Styles (hoisted to avoid re-allocation in .map() loop) ───
const GALLERY_CARD_STYLE = {
  width: "220px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
} as const;
const GALLERY_OVERLAY_STYLE = {
  background: "linear-gradient(to top, rgb(var(--surface) / 0.96) 0%, rgb(var(--surface) / 0.92) 50%, rgba(255,255,255,0) 100%)",
} as const;

// ─── Helpers ───
function resolveProduct(type: PriceType): PricingProduct {
  return PRODUCTS[type];
}

function redirectToLogin() {
  try { sessionStorage.setItem("mamastale_post_login_redirect", "/pricing"); } catch {}
  window.location.href = "/login?redirect=/pricing";
}

function PricingContent() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWorksheetMode, setIsWorksheetMode] = useState(false);
  const processingRef = useRef(false); // ref 기반 즉시 더블클릭 방지
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // Simplify: store only the type; derive amount/name via resolveProduct()
  const [confirmModal, setConfirmModal] = useState<PriceType | null>(null);

  // Dynamic social proof counter
  const [storyCount, setStoryCount] = useState(0);
  useEffect(() => {
    // ?tab=worksheet → 선생님 전용 활동지 구매 모드
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "worksheet") setIsWorksheetMode(true);

    trackPricingPageView();
    fetch("/api/community?limit=0")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total) setStoryCount(d.total); })
      .catch(() => {});
  }, []);

  // #26: Gallery dot indicator
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);

  // #11 WCAG AA: Focus trap ref for modal
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const { user, loading: authLoading } = useAuth();
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  // Check if SDK already loaded
  useEffect(() => {
    if (window.TossPayments) setSdkReady(true);
  }, []);

  // #26: Gallery IntersectionObserver for dot indicator
  useEffect(() => {
    const container = galleryRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sceneRefs.current.indexOf(entry.target as HTMLDivElement);
            if (idx !== -1) setActiveSceneIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.5 }
    );

    sceneRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  // #11 WCAG AA: Modal focus trap + scroll lock
  useEffect(() => {
    if (!confirmModal) return;

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Save last focused element
    lastFocusedRef.current = document.activeElement as HTMLElement;

    // Focus modal on open
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleTab);
      // Restore scroll + focus on close
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus();
    };
  }, [confirmModal]);

  // ─── Direct Redirect Payment ───
  const handlePayment = useCallback(
    async (productType: PriceType) => {
      if (isProcessing || processingRef.current) return;
      processingRef.current = true;

      // handlePayment is only called from confirmPayment, which requires auth.
      // Login redirect is handled in initiatePayment (the entry point).
      if (!window.TossPayments || !tossClientKey || !user) {
        setError(
          "결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      setIsProcessing(true);
      setError("");

      try {
        const product = resolveProduct(productType);
        // R9-FIX(B1): Fallback for Kakao/Naver in-app browsers missing crypto.randomUUID()
        const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
        const orderId = `order_${uuid}`;

        hapticMedium();
        trackBeginCheckout(product.name, product.amount);
        trackPaymentStart(product.name, product.amount); // C1: 퍼널 트래킹

        const toss = window.TossPayments(tossClientKey);
        const payment = toss.payment({ customerKey: user.id });

        // 활동지 결제 시 returnTo=teacher 파라미터 추가
        const isWorksheet = productType.startsWith("worksheet_");
        const returnToParam = isWorksheet ? "&returnTo=teacher" : "";
        const tabParam = isWorksheet ? "&tab=worksheet" : "";

        await payment.requestPayment({
          method: "CARD",  // Toss SDK v2: "CARD"는 카드 결제 화면에서 간편결제(카카오/네이버/토스페이)도 선택 가능
          amount: { currency: "KRW", value: product.amount },
          orderId,
          orderName: product.name,
          successUrl: `${window.location.origin}/payment/success?mode=standard${returnToParam}`,
          failUrl: `${window.location.origin}/payment/fail${tabParam}`,
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
            "결제 처리 중 문제가 발생했습니다. 결제 정보를 확인하시거나 잠시 후 다시 시도해 주세요."
          );
        }
      } finally {
        setIsProcessing(false);
        processingRef.current = false;
      }
    },
    [isProcessing, user, tossClientKey]
  );

  // Payment with confirmation step
  const initiatePayment = (productType: PriceType, source = "card") => {
    trackPricingCtaClick(productType, source);
    if (!user && !authLoading) {
      redirectToLogin();
      return;
    }
    trackPricingModalOpen(productType);
    setConfirmModal(productType);
  };

  const confirmPayment = () => {
    if (!confirmModal) return;
    trackPricingModalConfirm(confirmModal);
    handlePayment(confirmModal);
    setConfirmModal(null);
  };

  const modalProduct = confirmModal ? resolveProduct(confirmModal) : null;

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

      <div className="relative z-[1] max-w-lg mx-auto px-6 pt-12 pb-40">
        {/* ════════════════════════════════════════
            HERO
            ════════════════════════════════════════ */}
        <section className="text-center mb-6" aria-label="요금 안내">
          <h1 className="font-serif text-2xl text-brown font-bold mb-3 leading-tight">
            아이를 위한
            <br />
            세상에 하나뿐인 동화
          </h1>
          <p className="text-sm text-brown-light font-light leading-relaxed break-keep">
            엄마의 마음 이야기가 AI 대화를 통해
            <br />
            세상에 단 하나뿐인 10장면 동화 스토리가 됩니다
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(127,191,176,0.12)", color: "#5A9E8F" }}>
            <span>✨</span>
            <span>가입하면 첫 동화 1편 무료</span>
          </div>
        </section>

        {/* #17: Dynamic social proof counter */}
        {storyCount > 0 && (
          <p className="text-[12px] text-brown-pale font-light text-center mb-8 mt-6">
            {storyCount > 10
              ? <>지금까지 <span className="text-coral font-medium">{storyCount}편</span>의 동화가 만들어졌어요</>
              : "엄마들의 이야기가 시작되고 있어요"}
          </p>
        )}

        {/* ════════════════════════════════════════
            R2: SINGLE TICKET (₩3,920) — PRIMARY (순서 반전)
            ════════════════════════════════════════ */}
        {/* ════════════════════════════════════════
            WORKSHEET SECTION (선생님 모드에서만, 동화 카드 위에)
            ════════════════════════════════════════ */}
        {isWorksheetMode && (
          <div id="worksheet" className="mb-6">
            <h3 className="font-serif text-center text-lg text-brown font-semibold mb-1">선생님을 위한 활동지</h3>
            <p className="text-center text-xs text-brown-light font-light mb-4">AI가 동화 내용에 맞춰 활동지를 자동 생성합니다</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "rgb(var(--surface) / 0.6)", border: "1.5px solid rgba(127,191,176,0.3)" }}>
                <div className="text-center">
                  <div className="inline-block px-2 py-0.5 rounded-full text-[10px] text-white font-bold mb-2" style={{ background: "linear-gradient(135deg, #7FBFB0, #6AAF9E)" }}>론칭 할인 20%</div>
                  <p className="text-xs text-brown-light font-light">활동지 1건</p>
                  <div className="flex items-baseline justify-center gap-1.5 mt-1">
                    <span className="text-[11px] text-brown-pale line-through">₩2,400</span>
                    <span className="font-serif text-xl font-bold text-brown">₩1,900</span>
                  </div>
                </div>
                <button
                  onClick={() => initiatePayment("worksheet_single")}
                  disabled={isProcessing || !sdkReady}
                  className="w-full mt-3 py-2.5 rounded-full text-xs font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #7FBFB0, #6AAF9E)" }}
                >
                  {isProcessing ? "이동 중..." : "1건 구매하기"}
                </button>
              </div>

              <div className="rounded-2xl p-4 relative" style={{ background: "rgb(var(--surface) / 0.6)", border: "1.5px solid rgba(127,191,176,0.4)" }}>
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] text-white font-bold" style={{ background: "linear-gradient(135deg, #7FBFB0, #6AAF9E)" }}>
                  론칭 할인 20%
                </div>
                <div className="text-center pt-1">
                  <p className="text-xs text-brown-light font-light">활동지 5건</p>
                  <div className="flex items-baseline justify-center gap-1.5 mt-1">
                    <span className="text-[11px] text-brown-pale line-through">₩9,500</span>
                    <span className="font-serif text-xl font-bold text-brown">₩7,600</span>
                  </div>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: "#7FBFB0" }}>건당 ₩1,520</p>
                </div>
                <button
                  onClick={() => initiatePayment("worksheet_bundle")}
                  disabled={isProcessing || !sdkReady}
                  className="w-full mt-3 py-2.5 rounded-full text-xs font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #7FBFB0, #6AAF9E)" }}
                >
                  {isProcessing ? "이동 중..." : "5건 묶음 구매"}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-brown-pale/60 font-light text-center mt-2">
              첫 활동지 1건은 무료! · 9종 활동지 지원 · 영구 보관
            </p>
          </div>
        )}

        <div
          id="pricing"
          className="rounded-3xl p-6 mb-5 relative"
          style={{
            background: "rgb(var(--surface) / 0.7)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            border: "2px solid rgba(224,122,95,0.25)",
          }}
        >
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] text-white font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            }}
          >
            론칭 할인 20%
          </div>

          <div className="text-center mb-5 pt-2">
            <h3 className="font-serif text-lg text-brown font-semibold">
              동화 한 편 · 15분 완성
            </h3>
            <p className="text-xs text-brown-light font-light mt-1">카페 라떼 한 잔 가격으로 세상에 하나뿐인 동화를</p>
            <div className="flex items-baseline justify-center gap-2 mt-3">
              <span className="text-sm text-brown-pale line-through">
                ₩4,900
              </span>
              <span className="font-serif text-3xl font-bold text-brown">
                ₩3,920
              </span>
            </div>
          </div>

          <p className="text-[10px] text-brown-pale/60 font-light text-center mb-2">VAT 포함 · <Link href="/terms#section9" className="underline underline-offset-2 decoration-brown-pale/30">환불 정책 보기</Link></p>
          <button
            onClick={() => initiatePayment("ticket")}
            disabled={isProcessing || !sdkReady}
            className="w-full py-4 rounded-full text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {isProcessing
              ? "결제 페이지로 이동 중..."
              : "동화 한 편 만들기"}
          </button>
          {/* PR4-#9: 보안 신호 */}
          <p className="text-caption-sm text-brown-pale/60 font-light text-center mt-2">🔒 토스 안전결제 · 미사용 전액 환불</p>
        </div>

        {/* ════════════════════════════════════════
            R2: BUNDLE (₩14,900) — SECONDARY (더 많이 절약)
            ════════════════════════════════════════ */}
        <div
          className="rounded-2xl p-5 mb-6 relative pt-6"
          style={{
            background: "rgb(var(--surface) / 0.6)",
            border: "1.5px solid rgba(109,76,145,0.25)",
          }}
        >
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] text-white font-bold"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
            }}
          >
            더 많이 절약하기
          </div>

          <div className="text-center mb-4">
            <h3 className="font-serif text-base text-brown font-semibold">
              4일 프로그램 · 동화 4편
            </h3>
            <p className="text-xs text-brown-light font-light mt-1.5 break-keep">
              4일 연속 대화하면, 마음이 한결 가벼워집니다
            </p>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="font-serif text-2xl font-bold text-brown">
                ₩14,900
              </span>
            </div>
            <p className="text-sm font-medium mt-1" style={{ color: "#E07A5F" }}>
              1권당 ₩{Math.floor(PRODUCTS.bundle.amount / PRODUCTS.bundle.tickets).toLocaleString()} · ₩{(PRODUCTS.ticket.amount * PRODUCTS.bundle.tickets - PRODUCTS.bundle.amount).toLocaleString()} 절약
            </p>
          </div>

          <p className="text-[10px] text-brown-pale/60 font-light text-center mb-2">VAT 포함 · <Link href="/terms#section9" className="underline underline-offset-2 decoration-brown-pale/30">환불 정책 보기</Link></p>
          <button
            onClick={() => initiatePayment("bundle")}
            disabled={isProcessing || !sdkReady}
            className="w-full py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
              boxShadow: "0 4px 16px rgba(109,76,145,0.25)",
            }}
          >
            {isProcessing
              ? "결제 페이지로 이동 중..."
              : "4일 프로그램 시작하기"}
          </button>
        </div>

        {/* ════════════════════════════════════════
            TRUST BADGES (통합)
            ════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap text-[11px] text-brown-pale font-light">
          <span>카드 결제 보안</span>
          <span aria-hidden="true">·</span>
          <span>전자영수증</span>
          <span aria-hidden="true">·</span>
          <span>개인정보 보호</span>
          <span aria-hidden="true">·</span>
          <span>토스페이먼츠</span>
        </div>

        {/* SDK load error */}
        {sdkError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200" role="alert">
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
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200" role="alert" aria-live="assertive">
            <p className="text-xs text-red-600 text-center">{error}</p>
          </div>
        )}

        {!sdkReady && !sdkError && (
          <p className="text-xs text-brown-pale text-center mb-2 animate-pulse" aria-live="polite">
            결제 시스템을 불러오는 중...
          </p>
        )}

        {/* ════════════════════════════════════════
            SOCIAL PROOF
            ════════════════════════════════════════ */}
        <section id="reviews" className="text-center mb-6" aria-label="사용자 후기">
          <div className="flex items-center justify-center gap-1 mb-5">
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: 5 }, (_, j) => (
                <span
                  key={j}
                  className="text-sm"
                  style={{ color: "rgb(var(--coral))" }}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm font-bold text-brown font-serif ml-1">4.8</span>
            <span className="sr-only">평균 만족도 4.8점 (5점 만점)</span>
          </div>

          <div className="space-y-3">
            {FEATURED_REVIEWS.slice(0, 1).map((r, i) => (
              <div
                key={i}
                className="rounded-xl p-4 text-left"
                style={{
                  background: "rgb(var(--surface) / 0.6)",
                  border: "1px solid rgba(196,149,106,0.1)",
                }}
              >
                <div className="flex items-center gap-1 mb-1.5" aria-label={`${r.rating}점 만점`}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <span
                      key={j}
                      className="text-[11px]"
                      style={{
                        color: j < r.rating ? "rgb(var(--coral))" : "rgb(var(--brown-pale))",
                      }}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-brown font-light leading-relaxed break-keep">
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-brown-pale font-light">
                    — {r.name}
                  </p>
                  {/* #11: 9px → 11px */}
                  <span className="text-[11px] text-brown-pale/60 font-light">{r.date} · 인증된 구매자</span>
                </div>
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
            FREE TRIAL CTA (#2)
            ════════════════════════════════════════ */}
        <div
          id="trial"
          className="rounded-2xl p-4 mb-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(127,191,176,0.08), rgba(127,191,176,0.03))",
            border: "1.5px solid rgba(127,191,176,0.2)",
          }}
        >
          <p className="text-sm text-brown font-medium mb-1">
            아직 고민되시나요?
          </p>
          <p className="text-[12px] text-brown-light font-light mb-3 break-keep">
            로그인 없이 AI 대화를 무료로 체험해 보세요
          </p>
          <Link
            href="/?action=start"
            className="inline-block px-6 py-2.5 rounded-full text-[13px] font-medium text-white no-underline transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #7FBFB0, #6BAA9C)",
              boxShadow: "0 4px 16px rgba(127,191,176,0.3)",
            }}
          >
            무료로 체험하기
          </Link>
        </div>

        {/* ════════════════════════════════════════
            10-SCENE STORYBOOK GALLERY
            ════════════════════════════════════════ */}
        <details className="mb-6">
          <summary className="text-center text-sm text-coral font-medium cursor-pointer list-none py-3 select-none">
            동화 미리보기 ▼
          </summary>
        <section id="gallery" aria-label="동화 갤러리">
          <h2 className="font-serif text-lg text-brown font-semibold text-center mb-1">
            노란 텐트 속 무지개 마법
          </h2>
          <p className="text-[11px] text-brown-light font-light text-center mb-5">
            마마스테일 강민준 대표의 실제 사연을 바탕으로 마마스테일 서비스의 탄생 배경을 알 수 있는 동화입니다
          </p>
          {/* #11: 9px → 11px for WCAG AA minimum text */}
          <p className="text-[11px] text-brown-pale/60 font-light text-center mb-3">
            ← 옆으로 넘겨보세요 →
          </p>
          <div
            ref={galleryRef}
            className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
            role="region"
            aria-label="동화 장면 갤러리 - 옆으로 스크롤"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {GALLERY_SCENES.map((text, i) => (
              <div
                key={i}
                ref={(el) => { sceneRefs.current[i] = el; }}
                className="flex-shrink-0 snap-center rounded-xl overflow-hidden relative"
                style={GALLERY_CARD_STYLE}
              >
                {/* #11: eager loading for first 2 images to reduce layout shift */}
                <Image
                  src={`/images/sample-tent/scene-${String(i + 1).padStart(2, "0")}.jpg`}
                  alt={`동화 장면 ${i + 1}: ${text.slice(0, 30)}...`}
                  width={220}
                  height={392}
                  className="w-full aspect-[9/16] object-cover object-top"
                  loading={i < 2 ? "eager" : "lazy"}
                />
                {/* Storybook text overlay */}
                <div
                  className="absolute inset-x-0 bottom-0 px-4 pt-16 pb-4 flex flex-col justify-end"
                  style={GALLERY_OVERLAY_STYLE}
                >
                  {/* #11: 11.5px → 12px for better readability */}
                  <p
                    className="font-serif text-[12px] leading-[1.9] break-keep text-brown"
                  >
                    {text}
                  </p>
                  {/* #11: 9px → 11px */}
                  <p className="text-[11px] text-brown-pale font-light mt-2 text-right">
                    {i + 1} / 10
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* #26: Dot indicators */}
          <div className="flex items-center justify-center gap-0.5 mt-3" role="tablist" aria-label="장면 탐색">
            {GALLERY_SCENES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  sceneRefs.current[idx]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                role="tab"
                aria-selected={idx === activeSceneIndex}
                aria-label={`${idx + 1}번째 장면`}
                className="flex items-center justify-center min-w-[28px] min-h-[28px] transition-all duration-300"
              >
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: idx === activeSceneIndex ? 16 : 5,
                    height: 5,
                    background: idx === activeSceneIndex
                      ? "linear-gradient(135deg, #E07A5F, #C96B52)"
                      : "rgba(196,149,106,0.2)",
                  }}
                />
              </button>
            ))}
          </div>

          {/* #34: Soft CTA after gallery — capture emotional peak */}
          <p className="text-center mt-4">
            <Link
              href="/?action=start"
              className="text-[12px] text-coral font-medium no-underline"
            >
              나만의 동화 만들기 →
            </Link>
          </p>
        </section>
        </details>

        {/* ════════════════════════════════════════
            VIDEO PREVIEW
            ════════════════════════════════════════ */}
        <details className="mb-6">
          <summary className="text-center text-sm text-coral font-medium cursor-pointer list-none py-3 select-none">
            영상 보기 ▼
          </summary>
        <section aria-label="동화 영상 미리보기">
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
                loading="lazy"
              />
            ) : (
              <button
                type="button"
                onClick={() => setVideoLoaded(true)}
                className="w-full h-full relative flex flex-col items-center justify-center cursor-pointer group"
                aria-label="동화 영상 재생하기"
              >
                {/* #9: YouTube thumbnail as poster image */}
                <Image
                  src="https://img.youtube.com/vi/S7Fs_Kvpr40/hqdefault.jpg"
                  alt=""
                  fill
                  className="object-cover rounded-2xl"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
                <span className="relative z-10 w-14 h-14 rounded-full bg-coral/90 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ boxShadow: "0 4px 16px rgba(224,122,95,0.4)" }}>
                  <span className="ml-1 border-l-[14px] border-y-[9px] border-l-white border-y-transparent" aria-hidden="true" />
                </span>
                <span className="relative z-10 text-[12px] text-white font-medium drop-shadow-md">영상으로 미리보기</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-brown-pale font-light text-center mt-2">
            완성된 동화 스토리에 일러스트와 음성을 더한 영상 예시입니다
          </p>
          {/* #35: 줌 클래스 언급 제거 — 브랜드 혼란 방지 */}
        </section>
        </details>

        {/* ════════════════════════════════════════
            WHY TICKET MODEL
            ════════════════════════════════════════ */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgb(var(--surface) / 0.4)",
            border: "1px solid rgba(196,149,106,0.08)",
          }}
        >
          {/* #28: 방어적 "왜 1회 구매?" → 긍정 프레이밍 */}
          {/* #30: 라이프스타일 이미지 슬롯 — 실사 에셋 확보 후 교체 */}
          {/* <Image src="/images/lifestyle-mom-child.jpg" alt="엄마와 아이가 동화책을 읽는 모습" width={400} height={200} className="w-full rounded-xl mb-4 object-cover" /> */}
          <h3 className="font-serif text-sm font-semibold text-brown mb-3 text-center">
            이런 분에게 딱이에요
          </h3>
          <div className="space-y-3">
            {TARGET_AUDIENCE.map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-brown-pale flex-shrink-0" aria-hidden="true">
                  ●
                </span>
                <span className="text-xs text-brown-light font-light">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* #13: "준비 중인 기능" 섹션 제거 — 구매 지연 유발 */}

        {/* #18: 추천인 프로그램 티저 */}
        <div
          className="rounded-2xl p-4 mb-4 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(200,184,216,0.08), rgba(200,184,216,0.03))",
            border: "1px solid rgba(200,184,216,0.15)",
          }}
        >
          <p className="text-[12px] text-brown font-medium mb-0.5">
            친구와 함께하면 1편 무료
          </p>
          <p className="text-[11px] text-brown-light font-light">
            구매 후 추천 코드를 공유하면 서로 동화 1편을 선물받아요
          </p>
        </div>

        {/* ════════════════════════════════════════
            FAQ — with aria-expanded / aria-controls
            ════════════════════════════════════════ */}
        <div
          id="faq"
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "rgb(var(--surface) / 0.4)",
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
                  <span className="text-xs text-brown-pale ml-2 flex-shrink-0" aria-hidden="true">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {/* #15: FAQ accordion with height transition */}
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-3">
                      <p className="text-xs text-brown-light font-light leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
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
            심리적 위기 시 1393 (자살예방상담전화) 또는 1577-0199
            (정신건강위기상담전화)
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
        <p className="text-xs text-brown-pale font-light text-center mb-1 max-w-lg mx-auto">
          동화 1편 15분 완성 · 영구 보관 · PDF 다운로드
        </p>
        <div className="max-w-lg mx-auto flex gap-2">
          {/* R2: 단품 먼저 (순서 반전) */}
          <button
            onClick={() => initiatePayment("ticket", "sticky")}
            disabled={isProcessing || !sdkReady || sdkError}
            className="flex-[2] py-3 min-h-[44px] rounded-full text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
            }}
          >
            1편 · ₩3,920
          </button>
          <button
            onClick={() => initiatePayment("bundle", "sticky")}
            disabled={isProcessing || !sdkReady || sdkError}
            className="flex-1 py-3 min-h-[44px] rounded-full text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
              boxShadow: "0 4px 16px rgba(109,76,145,0.25)",
            }}
          >
            4편 · ₩14,900
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
        >
          {/* #11 WCAG AA: Focus-trapped modal container */}
          <div
            ref={modalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl p-6 max-w-sm w-[90%] mx-4 animate-in fade-in zoom-in-95 duration-200 outline-none"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirmModal(null);
            }}
          >
            <h3 className="font-serif text-lg text-brown font-semibold text-center mb-2">
              결제 확인
            </h3>
            <p className="text-sm text-brown-light text-center mb-1">
              {modalProduct?.name}
            </p>
            <p className="text-2xl font-bold text-brown text-center font-serif mb-4">
              ₩{modalProduct?.amount.toLocaleString()}
            </p>
            <p className="text-[11px] text-brown-pale font-light text-center mb-3 leading-relaxed">
              동화를 완성한 분들이<br />
              <span className="text-coral font-medium">&ldquo;아이가 매일 읽어달라고 해요&rdquo;</span>라고 전해주셨어요
            </p>
            <p className="text-[11px] text-center mb-5 font-medium"
              style={{ color: "rgba(224,122,95,0.8)" }}
            >
              ※ 미사용 티켓은 고객센터를 통해 환불 가능 (<Link href="/terms" className="underline">이용약관 제9조</Link>)
            </p>
            <button
              onClick={confirmPayment}
              className="w-full py-3.5 rounded-full text-sm font-bold text-white transition-all active:scale-[0.97] mb-2"
              style={{
                background:
                  confirmModal === "bundle"
                    ? "linear-gradient(135deg, #6D4C91, #8B6FB0)"
                    : "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.25)",
              }}
            >
              결제하기
            </button>
            {/* Fix 1-9: 약관 + 환불 정책 링크 (전자상거래법 준수) */}
            <p className="text-[10px] text-brown-pale font-light text-center mb-2 break-keep">
              결제 시{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">이용약관</a>,{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">개인정보처리방침</a>{" "}
              및 환불 정책에 동의합니다.
            </p>
            <button
              onClick={() => { if (confirmModal) trackPricingModalCancel(confirmModal); setConfirmModal(null); }}
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

export default function PricingContentWrapper() {
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
