/**
 * 이벤트 트래킹 유틸리티
 *
 * A2: GA4 제거됨. 페이지뷰는 CF Web Analytics, 결제/전환 이벤트는
 * 서버 event_logs 테이블(logEvent)로 전환 완료.
 * 아래 함수들은 window.gtag가 없으므로 graceful no-op으로 동작.
 * 클라이언트 커스텀 이벤트가 필요하면 /api/events/track 엔드포인트 추가 검토.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

function track(event: string, params?: EventParams) {
  try {
    window.gtag?.("event", event, params);
  } catch {
    // GA not loaded or blocked — silently ignore
  }
}

// ── 페이지 / 화면 전환 ──
export function trackScreenView(screen: string) {
  track("screen_view", { screen_name: screen });
}

// ── 온보딩 ──
export function trackOnboardingComplete(parentRole: string, childAge: string) {
  track("onboarding_complete", { parent_role: parentRole, child_age: childAge });
}

// ── 동화 ──
export function trackStoryShare(storyId: string, method: string) {
  track("story_share", { story_id: storyId, method });
}

// ── 회원가입 ──
export function trackSignUp(method: string) {
  track("sign_up", { method });
}

// ── 결제 ──
export function trackBeginCheckout(product: string, price: number) {
  track("begin_checkout", { product, value: price, currency: "KRW" });
}

// ── 커뮤니티 ──
export function trackCommunityView(storyId: string) {
  track("community_view", { story_id: storyId });
}

export function trackCommunityLike(storyId: string) {
  track("community_like", { story_id: storyId });
}

// ── 퍼널 트래킹 (C1) ──

/** 온보딩 시작 (화면 진입) */
export function trackOnboardingStart() {
  track("onboarding_start");
}

/** 채팅 Phase 진입 */
export function trackChatPhaseEnter(phase: number) {
  track("chat_phase_enter", { phase });
}

/** 동화 완성 */
export function trackStoryComplete() {
  track("story_complete");
}

/** 동화 저장 */
export function trackStorySave() {
  track("story_save");
}

/** PDF 다운로드 */
export function trackPdfDownload() {
  track("pdf_download");
}

/** 결제 시작 (Toss SDK 호출 직전) */
export function trackPaymentStart(product: string, price: number) {
  track("payment_start", { product, value: price, currency: "KRW" });
}

/** 결제 완료 */
export function trackPaymentComplete(amount: number) {
  track("payment_complete", { value: amount, currency: "KRW" });
}

/** 결제 이탈/실패 */
export function trackPaymentAbandon(reason?: string) {
  track("payment_abandon", { reason });
}

/** 커뮤니티 "나도 만들기" 클릭 */
export function trackCommunityInspireClick() {
  track("community_inspire_click");
}

// ── 결제 페이지 퍼널 ──

/** 결제 페이지 진입 */
export function trackPricingPageView() {
  track("pricing_page_view");
}

/** 결제 CTA 클릭 (상품 카드 또는 고정바) */
export function trackPricingCtaClick(product: string, source: string) {
  track("pricing_cta_click", { product, source });
}

/** 결제 확인 모달 열림 */
export function trackPricingModalOpen(product: string) {
  track("pricing_modal_open", { product });
}

/** 결제 확인 모달에서 확정 */
export function trackPricingModalConfirm(product: string) {
  track("pricing_modal_confirm", { product });
}

/** 결제 확인 모달에서 취소 */
export function trackPricingModalCancel(product: string) {
  track("pricing_modal_cancel", { product });
}

/** 결제 완료 후 추천코드 노출 */
export function trackReferralShownPostPayment() {
  track("referral_shown_post_payment");
}
