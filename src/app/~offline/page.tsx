"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen min-h-dvh px-6 text-center bg-cream">
      <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(196,149,106,0.12)" }}>
        <span className="text-xl font-serif font-bold" style={{ color: "#C4956A" }}>M</span>
      </div>
      <h1 className="text-2xl font-bold text-brown mb-3 font-serif">
        오프라인 상태입니다
      </h1>
      <p className="text-brown-light mb-4 leading-relaxed font-light">
        인터넷 연결이 끊어졌어요.<br />
        Wi-Fi나 데이터를 확인해 주세요.
      </p>
      <p className="text-sm text-brown-pale mb-2">
        이전에 저장된 동화는 오프라인에서도 볼 수 있어요.
      </p>
      <Link
        href="/library"
        className="text-sm text-coral underline underline-offset-2 mb-6"
      >
        내 서재 바로가기
      </Link>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-coral text-white rounded-2xl font-medium hover:bg-coral/90 transition-colors min-h-[44px]"
      >
        다시 시도하기
      </button>
    </div>
  );
}
