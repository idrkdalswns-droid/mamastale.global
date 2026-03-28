"use client";

import Link from "next/link";

interface BlindUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlindUpsellModal({ isOpen, onClose }: BlindUpsellModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-md rounded-t-3xl px-6 pt-6 pb-8 animate-in slide-in-from-bottom duration-300"
        style={{ background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-brown-pale/30 rounded-full mx-auto mb-5" />

        <h3 className="font-serif text-lg font-bold text-brown text-center mb-2">
          전체 이야기가 궁금하신가요?
        </h3>
        <p className="text-[13px] text-brown-light font-light text-center leading-relaxed mb-6 break-keep">
          무료 체험 기간이 지났어요.<br />
          티켓을 구매하면 모든 동화를 영구적으로 읽을 수 있어요.
        </p>

        <Link
          href="/pricing"
          className="block w-full py-3.5 rounded-full text-center text-white text-[14px] font-medium no-underline transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          전체 이야기 읽기
        </Link>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full text-[13px] font-light text-brown-pale transition-all"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
