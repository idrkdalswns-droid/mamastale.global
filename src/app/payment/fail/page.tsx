"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("code") || "";
  const errorMessage = searchParams.get("message") || "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <div className="text-[56px] mb-4">😔</div>
        <h2 className="font-serif text-xl font-bold text-brown mb-3">
          결제에 실패했어요
        </h2>
        <p className="text-sm text-brown-light font-light mb-2 break-keep">
          {errorMessage}
        </p>
        {errorCode && (
          <p className="text-[10px] text-brown-pale mb-6">
            오류 코드: {errorCode}
          </p>
        )}

        <Link
          href="/pricing"
          className="inline-block w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #D4836B)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          다시 시도하기
        </Link>

        <Link
          href="/"
          className="block w-full py-3 rounded-full text-sm font-light text-brown-pale no-underline transition-all"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-cream flex items-center justify-center">
          <div className="text-3xl">😔</div>
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
