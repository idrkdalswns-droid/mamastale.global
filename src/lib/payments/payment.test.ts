import { describe, it, expect } from "vitest";
import { z } from "zod";

// ════════════════════════════════════════════════════════════
// Payment System Tests
// Tests for: price validation, order ID format, error codes,
// product configuration, Zod schema, idempotency logic
// ════════════════════════════════════════════════════════════

// ─── Extracted from /api/payments/confirm/route.ts ───
const VALID_PRICES: Record<number, number> = {
  4900: 1,
  18900: 5,
};

const confirmRequestSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^order_[a-f0-9-]+$/i, "Invalid order ID format"),
  amount: z.number().int().positive().max(1_000_000),
});

// ─── Extracted from payment/fail/page.tsx ───
const ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제가 취소되었습니다.",
  PAY_PROCESS_ABORTED: "결제가 중단되었습니다.",
  NOT_AVAILABLE_PAYMENT: "사용할 수 없는 결제 수단입니다.",
  EXCEED_MAX_DAILY_PAYMENT_COUNT: "일일 결제 횟수를 초과했습니다.",
  EXCEED_MAX_PAYMENT_AMOUNT: "결제 한도를 초과했습니다.",
  BELOW_MINIMUM_AMOUNT: "최소 결제 금액 미만입니다.",
  NOT_FOUND_PAYMENT: "결제 정보를 찾을 수 없습니다.",
  NOT_FOUND_PAYMENT_SESSION:
    "결제 세션이 만료되었습니다. 다시 시도해 주세요.",
  DUPLICATED_ORDER_ID: "이미 처리된 주문입니다.",
  UNAUTHORIZED_KEY: "결제 인증에 실패했습니다.",
  FORBIDDEN_REQUEST: "허용되지 않은 요청입니다.",
  REJECT_CARD_COMPANY:
    "카드사에서 거절되었습니다. 다른 카드를 사용해 주세요.",
  INVALID_CARD_EXPIRATION: "카드 유효기간이 만료되었습니다.",
  INVALID_STOPPED_CARD: "정지된 카드입니다. 카드사에 문의해 주세요.",
  INVALID_CARD_LOST_OR_STOLEN: "분실 또는 도난 신고된 카드입니다.",
  INVALID_CARD_NUMBER: "카드 번호가 올바르지 않습니다.",
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT:
    "할부 결제가 불가능한 카드입니다.",
  EASY_PAY_PROCESS_CANCELED: "간편결제가 취소되었습니다.",
  EASY_PAY_FAILED: "간편결제에 실패했습니다. 다시 시도해 주세요.",
  EASY_PAY_USER_CANCEL: "간편결제가 취소되었습니다.",
  FDS_ERROR: "이상 거래가 감지되어 결제가 중단되었습니다.",
  INVALID_BANK: "지원하지 않는 은행입니다.",
  NOT_AVAILABLE_BANK:
    "현재 이용할 수 없는 은행입니다. 잠시 후 다시 시도해 주세요.",
};

// ─── Product config (from pricing page) ───
const PRODUCTS = {
  ticket: { name: "동화 스토리 하나 완성 티켓", amount: 4900, tickets: 1 },
  bundle: { name: "동화 다섯 스토리 완성 티켓", amount: 18900, tickets: 5 },
};

// ════════════════════════════════════════════════════════════
// Price Validation
// ════════════════════════════════════════════════════════════

describe("VALID_PRICES", () => {
  it("maps ₩4,900 to 1 ticket", () => {
    expect(VALID_PRICES[4900]).toBe(1);
  });

  it("maps ₩18,900 to 5 tickets", () => {
    expect(VALID_PRICES[18900]).toBe(5);
  });

  it("rejects unknown amounts", () => {
    expect(VALID_PRICES[0]).toBeUndefined();
    expect(VALID_PRICES[100]).toBeUndefined();
    expect(VALID_PRICES[4899]).toBeUndefined();
    expect(VALID_PRICES[4901]).toBeUndefined();
    expect(VALID_PRICES[99999]).toBeUndefined();
    expect(VALID_PRICES[-4900]).toBeUndefined();
  });

  it("product amounts match VALID_PRICES keys", () => {
    expect(VALID_PRICES[PRODUCTS.ticket.amount]).toBe(PRODUCTS.ticket.tickets);
    expect(VALID_PRICES[PRODUCTS.bundle.amount]).toBe(PRODUCTS.bundle.tickets);
  });

  it("bundle is cheaper per ticket than single", () => {
    const singlePricePerTicket = PRODUCTS.ticket.amount / PRODUCTS.ticket.tickets;
    const bundlePricePerTicket = PRODUCTS.bundle.amount / PRODUCTS.bundle.tickets;
    expect(bundlePricePerTicket).toBeLessThan(singlePricePerTicket);
  });
});

// ════════════════════════════════════════════════════════════
// Confirm Request Schema (Zod Validation)
// ════════════════════════════════════════════════════════════

describe("confirmRequestSchema", () => {
  const validPayload = {
    paymentKey: "test_pk_abc123def456",
    orderId: "order_550e8400-e29b-41d4-a716-446655440000",
    amount: 4900,
  };

  it("accepts valid payment data", () => {
    expect(confirmRequestSchema.safeParse(validPayload).success).toBe(true);
  });

  it("accepts bundle amount", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, amount: 18900 }).success
    ).toBe(true);
  });

  // ─── paymentKey validation ───
  it("rejects empty paymentKey", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, paymentKey: "" }).success
    ).toBe(false);
  });

  it("rejects missing paymentKey", () => {
    const { paymentKey: _, ...rest } = validPayload;
    expect(confirmRequestSchema.safeParse(rest).success).toBe(false);
  });

  // ─── orderId validation ───
  it("rejects orderId without order_ prefix", () => {
    expect(
      confirmRequestSchema.safeParse({
        ...validPayload,
        orderId: "550e8400-e29b-41d4-a716-446655440000",
      }).success
    ).toBe(false);
  });

  it("rejects orderId with special characters (injection attempt)", () => {
    expect(
      confirmRequestSchema.safeParse({
        ...validPayload,
        orderId: "order_'; DROP TABLE profiles;--",
      }).success
    ).toBe(false);
  });

  it("rejects empty orderId", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, orderId: "" }).success
    ).toBe(false);
  });

  // ─── amount validation ───
  it("rejects zero amount", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, amount: 0 }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, amount: -4900 }).success
    ).toBe(false);
  });

  it("rejects decimal amount", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, amount: 4900.5 }).success
    ).toBe(false);
  });

  it("rejects excessively large amount (>1M)", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, amount: 1_000_001 })
        .success
    ).toBe(false);
  });

  it("rejects string amount", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, amount: "4900" }).success
    ).toBe(false);
  });

  // ─── Type coercion attacks ───
  it("rejects array paymentKey", () => {
    expect(
      confirmRequestSchema.safeParse({ ...validPayload, paymentKey: ["test"] })
        .success
    ).toBe(false);
  });

  it("rejects object amount", () => {
    expect(
      confirmRequestSchema.safeParse({
        ...validPayload,
        amount: { value: 4900 },
      }).success
    ).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// Error Code Mapping
// ════════════════════════════════════════════════════════════

describe("ERROR_MESSAGES", () => {
  it("has Korean messages for all error codes", () => {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      expect(message).toBeTruthy();
      // All messages should contain Korean characters
      expect(/[가-힣]/.test(message)).toBe(true);
      // No raw error codes leaked into messages
      expect(message).not.toContain(code);
    }
  });

  it("covers common card errors", () => {
    expect(ERROR_MESSAGES["REJECT_CARD_COMPANY"]).toBeDefined();
    expect(ERROR_MESSAGES["INVALID_CARD_EXPIRATION"]).toBeDefined();
    expect(ERROR_MESSAGES["INVALID_CARD_NUMBER"]).toBeDefined();
  });

  it("covers 간편결제 (easy pay) errors", () => {
    expect(ERROR_MESSAGES["EASY_PAY_PROCESS_CANCELED"]).toBeDefined();
    expect(ERROR_MESSAGES["EASY_PAY_FAILED"]).toBeDefined();
    expect(ERROR_MESSAGES["EASY_PAY_USER_CANCEL"]).toBeDefined();
  });

  it("covers bank transfer errors", () => {
    expect(ERROR_MESSAGES["INVALID_BANK"]).toBeDefined();
    expect(ERROR_MESSAGES["NOT_AVAILABLE_BANK"]).toBeDefined();
  });

  it("covers cancellation codes", () => {
    expect(ERROR_MESSAGES["PAY_PROCESS_CANCELED"]).toBeDefined();
    expect(ERROR_MESSAGES["PAY_PROCESS_ABORTED"]).toBeDefined();
  });

  it("covers fraud detection", () => {
    expect(ERROR_MESSAGES["FDS_ERROR"]).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════
// Error Code XSS Prevention (from fail page)
// ════════════════════════════════════════════════════════════

describe("error code validation (XSS prevention)", () => {
  const errorCodeRegex = /^[A-Z0-9_]{1,60}$/;

  it("accepts valid Toss error codes", () => {
    expect(errorCodeRegex.test("PAY_PROCESS_CANCELED")).toBe(true);
    expect(errorCodeRegex.test("EASY_PAY_FAILED")).toBe(true);
    expect(errorCodeRegex.test("REJECT_CARD_COMPANY")).toBe(true);
    expect(errorCodeRegex.test("FDS_ERROR")).toBe(true);
  });

  it("rejects script injection attempts", () => {
    expect(errorCodeRegex.test("<script>alert(1)</script>")).toBe(false);
    expect(errorCodeRegex.test("javascript:alert(1)")).toBe(false);
    expect(errorCodeRegex.test("' OR 1=1 --")).toBe(false);
  });

  it("rejects lowercase codes (Toss uses UPPER_SNAKE_CASE)", () => {
    expect(errorCodeRegex.test("pay_process_canceled")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(errorCodeRegex.test("")).toBe(false);
  });

  it("rejects overly long codes (>60 chars)", () => {
    const longCode = "A".repeat(61);
    expect(errorCodeRegex.test(longCode)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// Order ID Format
// ════════════════════════════════════════════════════════════

describe("order ID format", () => {
  const orderIdRegex = /^order_[a-f0-9-]+$/i;

  it("accepts UUID-based order IDs", () => {
    expect(orderIdRegex.test("order_550e8400-e29b-41d4-a716-446655440000")).toBe(
      true
    );
  });

  it("accepts order IDs from crypto.randomUUID()", () => {
    // Simulate what the pricing page generates
    const orderId = `order_${"a1b2c3d4-e5f6-7890-abcd-ef1234567890"}`;
    expect(orderIdRegex.test(orderId)).toBe(true);
  });

  it("rejects order IDs without prefix", () => {
    expect(
      orderIdRegex.test("550e8400-e29b-41d4-a716-446655440000")
    ).toBe(false);
  });

  it("rejects SQL injection in order ID", () => {
    expect(orderIdRegex.test("order_'; DROP TABLE users;--")).toBe(false);
  });

  it("rejects empty order ID", () => {
    expect(orderIdRegex.test("")).toBe(false);
    expect(orderIdRegex.test("order_")).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// Product Configuration Consistency
// ════════════════════════════════════════════════════════════

describe("product configuration", () => {
  it("ticket product has correct price (₩4,900)", () => {
    expect(PRODUCTS.ticket.amount).toBe(4900);
  });

  it("bundle product has correct price (₩18,900)", () => {
    expect(PRODUCTS.bundle.amount).toBe(18900);
  });

  it("ticket gives 1 ticket", () => {
    expect(PRODUCTS.ticket.tickets).toBe(1);
  });

  it("bundle gives 5 tickets", () => {
    expect(PRODUCTS.bundle.tickets).toBe(5);
  });

  it("all product amounts are in VALID_PRICES", () => {
    expect(VALID_PRICES[PRODUCTS.ticket.amount]).toBeDefined();
    expect(VALID_PRICES[PRODUCTS.bundle.amount]).toBeDefined();
  });

  it("product names are Korean", () => {
    expect(/[가-힣]/.test(PRODUCTS.ticket.name)).toBe(true);
    expect(/[가-힣]/.test(PRODUCTS.bundle.name)).toBe(true);
  });

  it("bundle discount is correct (~23%)", () => {
    const fullPrice = PRODUCTS.ticket.amount * PRODUCTS.bundle.tickets;
    const discount = (1 - PRODUCTS.bundle.amount / fullPrice) * 100;
    expect(discount).toBeGreaterThan(20);
    expect(discount).toBeLessThan(25);
  });
});

// ════════════════════════════════════════════════════════════
// Payment Method Labels (success page)
// ════════════════════════════════════════════════════════════

describe("payment method labels", () => {
  const PAYMENT_METHOD_LABELS: Record<
    string,
    { icon: string; label: string }
  > = {
    카드: { icon: "💳", label: "카드" },
    간편결제: { icon: "📱", label: "간편결제" },
    계좌이체: { icon: "🏦", label: "계좌이체" },
    가상계좌: { icon: "🏧", label: "가상계좌" },
    휴대폰: { icon: "📞", label: "휴대폰" },
  };

  it("has labels for all major Korean payment methods", () => {
    expect(PAYMENT_METHOD_LABELS["카드"]).toBeDefined();
    expect(PAYMENT_METHOD_LABELS["간편결제"]).toBeDefined();
    expect(PAYMENT_METHOD_LABELS["계좌이체"]).toBeDefined();
  });

  it("each label has an icon and text", () => {
    for (const [, value] of Object.entries(PAYMENT_METHOD_LABELS)) {
      expect(value.icon).toBeTruthy();
      expect(value.label).toBeTruthy();
    }
  });

  it("unknown payment method returns undefined (safe fallback)", () => {
    expect(PAYMENT_METHOD_LABELS["UNKNOWN_METHOD"]).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════
// Idempotency Logic
// ════════════════════════════════════════════════════════════

describe("order deduplication logic", () => {
  it("simulates in-memory dedup map behavior", () => {
    const processedOrders = new Map<string, number>();
    const ORDER_DEDUP_TTL_MS = 600_000;

    function isOrderProcessed(orderId: string): boolean {
      const now = Date.now();
      if (processedOrders.size > 500) {
        for (const [id, ts] of processedOrders) {
          if (now - ts > ORDER_DEDUP_TTL_MS) processedOrders.delete(id);
        }
      }
      if (processedOrders.has(orderId)) return true;
      processedOrders.set(orderId, now);
      return false;
    }

    const orderId = "order_test-123";

    // First call: not processed
    expect(isOrderProcessed(orderId)).toBe(false);

    // Second call: already processed
    expect(isOrderProcessed(orderId)).toBe(true);

    // Different order: not processed
    expect(isOrderProcessed("order_test-456")).toBe(false);
  });
});
