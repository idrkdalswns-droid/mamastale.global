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
export function trackOnboardingStep(step: number) {
  track("onboarding_step", { step });
}

export function trackOnboardingComplete(parentRole: string, childAge: string) {
  track("onboarding_complete", { parent_role: parentRole, child_age: childAge });
}

// ── 대화 ──
export function trackPhaseTransition(from: number, to: number) {
  track("phase_transition", { from_phase: from, to_phase: to });
}

export function trackChatTurn(phase: number, turnCount: number) {
  track("chat_turn", { phase, turn_count: turnCount });
}

// ── 동화 ──
export function trackStoryComplete(storyId: string) {
  track("story_complete", { story_id: storyId });
}

export function trackStoryShare(storyId: string, method: string) {
  track("story_share", { story_id: storyId, method });
}

export function trackPdfDownload(storyId: string) {
  track("pdf_download", { story_id: storyId });
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
