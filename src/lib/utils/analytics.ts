/**
 * GA4 이벤트 트래킹 유틸리티
 * gtag가 로드되지 않은 경우 (쿠키 미동의 등) 조용히 무시
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
