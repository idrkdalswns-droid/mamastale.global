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
