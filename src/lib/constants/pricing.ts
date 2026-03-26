/**
 * Pricing constants — Single Source of Truth for amount→ticket mapping.
 *
 * Bug Bounty Fix 2-4: Previously hardcoded in 3 separate files:
 * - payments/confirm/route.ts (STORY_PRICES, WORKSHEET_PRICES)
 * - webhooks/stripe/route.ts (STRIPE_AMOUNT_TO_TICKETS)
 * - payment/success/page.tsx (derivedTickets inline)
 *
 * IMPORTANT: This file is imported by both Edge Runtime API routes and
 * client-side components. Keep it pure — no browser or Node.js APIs.
 *
 * When adding new prices, update ONLY this file.
 *
 * @module constants/pricing
 */

/** Story ticket prices: amount (KRW) → ticket count */
export const STORY_PRICES: Record<number, number> = {
  3920: 1,   // ₩3,920 = 1 ticket (론칭 할인 20%)
  4900: 1,   // ₩4,900 = 1 ticket (정가)
  14900: 4,  // ₩14,900 = 4 tickets (4일 프로그램)
};

/** Worksheet ticket prices: amount (KRW) → ticket count */
export const WORKSHEET_PRICES: Record<number, number> = {
  1900: 1,   // ₩1,900 = 활동지 1건 (론칭 할인 20%)
  7600: 5,   // ₩7,600 = 활동지 5건 (론칭 할인 20%, 건당 ₩1,520)
};

/** All valid prices (story + worksheet) */
export const ALL_PRICES: Record<number, number> = {
  ...STORY_PRICES,
  ...WORKSHEET_PRICES,
};

/**
 * Look up ticket count for a given payment amount.
 * Returns null if the amount is not a valid price.
 */
export function ticketsForAmount(amount: number): number | null {
  return ALL_PRICES[amount] ?? null;
}

/**
 * Resolve ticket type and count for a given payment amount.
 * Returns null if the amount is not a valid price.
 */
export function resolveTicketType(
  amount: number
): { type: "story" | "worksheet"; tickets: number } | null {
  if (STORY_PRICES[amount]) return { type: "story", tickets: STORY_PRICES[amount] };
  if (WORKSHEET_PRICES[amount]) return { type: "worksheet", tickets: WORKSHEET_PRICES[amount] };
  return null;
}

/** Allowed currencies for international payments */
export const ALLOWED_CURRENCIES = ["krw", "usd", "jpy", "eur"];

// ── Display-facing pricing (H13: remove hardcoded prices from UI components) ──

/** Minimum story price for display (KRW) */
export const STORY_PRICE_MIN_KRW = 3_920;
/** Story regular price for display (KRW) */
export const STORY_PRICE_REGULAR_KRW = 4_900;
/** Formatted display string for minimum story price */
export const STORY_PRICE_DISPLAY = "₩3,920";
/** Formatted display string "부터" suffix for minimum story price */
export const STORY_PRICE_FROM_DISPLAY = "₩3,920부터";
