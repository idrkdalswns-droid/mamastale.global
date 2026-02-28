"use client";

import { useState } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { AdBanner } from "@/components/ads/AdBanner";

export default function PricingPage() {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const handleCheckout = async (priceType: "ticket" | "bundle") => {
    setLoadingType(priceType);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "결제 페이지로 이동할 수 없습니다.");
      }
    } catch {
      alert("결제 시스템에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-dvh bg-cream px-6 py-12 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={100} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1]">
        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-2xl font-bold text-brown no-underline">
            mamastale
          </Link>
          <h2 className="font-serif text-xl text-brown font-semibold mt-4 mb-2">
            요금 안내
          </h2>
          <p className="text-sm text-brown-light font-light leading-relaxed">
            첫 동화는 무료, 그 다음부터는<br />
            커피 한 잔 값으로 새로운 치유 동화를
          </p>
        </div>

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
              "4단계 AI 치유 대화 (공감 → 질문 → 은유 → 동화)",
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
            BEST VALUE
          </div>

          <div className="text-center mb-4 pt-1">
            <div className="text-3xl mb-2">🎫</div>
            <h3 className="font-serif text-lg text-brown font-semibold">동화 1권 티켓</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="font-serif text-3xl font-bold text-brown">₩2,000</span>
              <span className="text-sm text-brown-light font-light">/1권</span>
            </div>
            <p className="text-xs text-brown-pale mt-1">커피 한 잔 값으로 새로운 동화를</p>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              "4단계 AI 치유 대화 전 과정 1회",
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
            disabled={loadingType === "ticket"}
            className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {loadingType === "ticket" ? "결제 페이지 이동 중..." : "🎫 티켓 구매하기 · ₩2,000"}
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
            <h3 className="font-serif text-lg text-brown font-semibold">5권 묶음 패키지</h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="font-serif text-3xl font-bold text-brown">₩8,000</span>
              <span className="text-sm text-brown-light font-light">/5권</span>
            </div>
            <p className="text-xs text-coral mt-1 font-medium">20% 할인 · 1권당 ₩1,600</p>
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
            disabled={loadingType === "bundle"}
            className="w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "transparent",
              color: "#6D4C91",
              border: "1.5px solid rgba(109,76,145,0.3)",
            }}
          >
            {loadingType === "bundle" ? "결제 페이지 이동 중..." : "✨ 5권 묶음 구매 · ₩8,000"}
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
              { emoji: "📖", text: "한 권 한 권이 완전한 치유 여정" },
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
          <Link href="/" className="text-sm text-brown-mid font-light no-underline">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
