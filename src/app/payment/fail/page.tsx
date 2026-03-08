"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

// Map Toss error codes to safe, predefined Korean messages
// Covers: 카드, 카카오페이, 네이버페이, 토스페이, 계좌이체 + confirm API 에러
const ERROR_MESSAGES: Record<string, string> = {
  // ─── 공통 (결제창) ───
  PAY_PROCESS_CANCELED: "결제가 취소되었습니다.",
  PAY_PROCESS_ABORTED: "결제가 중단되었습니다.",
  USER_CANCEL: "결제가 취소되었습니다.",
  NOT_AVAILABLE_PAYMENT: "사용할 수 없는 결제 수단입니다.",
  EXCEED_MAX_DAILY_PAYMENT_COUNT: "일일 결제 횟수를 초과했습니다.",
  EXCEED_MAX_PAYMENT_AMOUNT: "결제 한도를 초과했습니다.",
  BELOW_MINIMUM_AMOUNT: "최소 결제 금액 미만입니다.",
  NOT_FOUND_PAYMENT: "결제 정보를 찾을 수 없습니다.",
  NOT_FOUND_PAYMENT_SESSION: "결제 세션이 만료되었습니다. 다시 시도해 주세요.",
  DUPLICATED_ORDER_ID: "이미 처리된 주문입니다.",
  UNAUTHORIZED_KEY: "결제 인증에 실패했습니다.",
  FORBIDDEN_REQUEST: "허용되지 않은 요청입니다.",
  // ─── 카드 결제 ───
  REJECT_CARD_COMPANY: "카드사에서 거절되었습니다. 다른 카드를 사용해 주세요.",
  INVALID_CARD_EXPIRATION: "카드 유효기간이 만료되었습니다.",
  INVALID_STOPPED_CARD: "정지된 카드입니다. 카드사에 문의해 주세요.",
  INVALID_CARD_LOST_OR_STOLEN: "분실 또는 도난 신고된 카드입니다.",
  INVALID_CARD_NUMBER: "카드 번호가 올바르지 않습니다.",
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT: "할부 결제가 불가능한 카드입니다.",
  // ─── 간편결제 (카카오페이, 네이버페이, 토스페이) ───
  EASY_PAY_PROCESS_CANCELED: "간편결제가 취소되었습니다.",
  EASY_PAY_FAILED: "간편결제에 실패했습니다. 다시 시도해 주세요.",
  EASY_PAY_USER_CANCEL: "간편결제가 취소되었습니다.",
  FDS_ERROR: "이상 거래가 감지되어 결제가 중단되었습니다.",
  // ─── 계좌이체 ───
  INVALID_BANK: "지원하지 않는 은행입니다.",
  NOT_AVAILABLE_BANK: "현재 이용할 수 없는 은행입니다. 잠시 후 다시 시도해 주세요.",
  // ─── Confirm API 에러 (서버 → 클라이언트 포워딩) ───
  ALREADY_PROCESSED_PAYMENT: "이미 처리된 결제입니다.",
  PROVIDER_ERROR: "결제 서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  INVALID_PAYMENT_AMOUNT: "결제 금액이 올바르지 않습니다.",
  INVALID_ORDER_ID: "주문 번호가 올바르지 않습니다.",
  INVALID_API_KEY: "결제 인증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  CONFIRM_FAILED: "결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  TICKET_INCREMENT_FAILED: "결제는 완료되었으나 티켓 충전에 실패했습니다. 고객센터에 문의해 주세요.",
  MISSING_SECRET_KEY: "결제 시스템 설정 오류입니다. 고객센터에 문의해 주세요.",
  UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  REJECT_ACCOUNT_PAYMENT: "계좌 결제가 거절되었습니다. 다른 결제 수단을 사용해 주세요.",
  REJECT_TOSSPAY_INVALID_ACCOUNT: "토스페이 계좌 정보가 올바르지 않습니다.",
  EXCEED_MAX_AUTH_COUNT: "인증 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.",
  NOT_AVAILABLE_PAYMENT_METHOD: "사용할 수 없는 결제 수단입니다. 다른 결제 수단을 선택해 주세요.",
};

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const rawCode = searchParams.get("code") || "";
  // KR-11: Validate errorCode format (alphanumeric + underscore only) to prevent XSS/injection
  const errorCode = /^[A-Z0-9_]{1,60}$/.test(rawCode) ? rawCode : "";
  // Security: use predefined messages only (prevent phishing via URL params)
  const errorMessage = ERROR_MESSAGES[errorCode] || "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <h2 className="font-serif text-xl font-bold text-brown mb-3">
          결제에 실패했어요
        </h2>
        <p className="text-sm text-brown-light font-light mb-2 break-keep">
          {errorMessage}
        </p>
        {errorCode && (
          <p className="text-[10px] text-brown-pale mb-4">
            오류 코드: {errorCode}
          </p>
        )}

        <p className="text-sm text-brown-light font-light mb-6 break-keep">
          결제 정보를 확인하시거나 다른 결제 수단으로 다시 시도해 주세요
        </p>

        <Link
          href="/pricing"
          className="inline-block w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
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

        <p className="text-[11px] text-brown-pale font-light mt-6">
          문제가 계속되면{" "}
          <a
            href="mailto:kang.minjune@icloud.com"
            className="text-coral underline underline-offset-2"
          >
            kang.minjune@icloud.com
          </a>
          으로 문의해 주세요
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-cream flex items-center justify-center">
          <div className="text-sm text-brown-pale">결제 처리 중...</div>
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
