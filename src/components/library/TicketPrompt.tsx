"use client";

import Link from "next/link";

interface TicketPromptProps {
  remaining: number;
}

export default function TicketPrompt({ remaining }: TicketPromptProps) {
  if (remaining > 0) return null;

  return (
    <div
      className="rounded-2xl p-4 mb-4 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(224,122,95,0.08) 0%, rgba(232,168,124,0.06) 100%)",
        border: "1.5px solid rgba(224,122,95,0.15)",
      }}
    >
      <p className="text-sm text-brown font-medium mb-1">
        새 동화를 만들려면 이용권이 필요해요
      </p>
      <p className="text-[11px] text-brown-light font-light mb-3">
        15분 대화로 세상에 하나뿐인 동화를 완성하세요
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-white no-underline transition-all active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg, #E07A5F, #C96B52)",
          boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
        }}
      >
        이용권 구매하기
      </Link>
    </div>
  );
}
