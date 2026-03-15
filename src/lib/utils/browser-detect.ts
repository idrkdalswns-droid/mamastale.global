/**
 * 인앱 브라우저 감지 유틸리티
 *
 * Google은 2016년부터 WebView/인앱 브라우저에서 OAuth를 차단 (403 disallowed_useragent).
 * 한국 서비스에서 카카오톡 공유 → 인앱 브라우저 유입이 빈번하므로 사전 감지 필요.
 */

export type InAppBrowser =
  | "kakao"
  | "naver"
  | "instagram"
  | "facebook"
  | "line"
  | "tiktok"
  | "generic"
  | null;

/** 인앱 브라우저 종류를 반환. 일반 브라우저면 null. */
export function detectInAppBrowser(): InAppBrowser {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/NAVER/i.test(ua)) return "naver";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV/i.test(ua)) return "facebook";
  if (/Line\//i.test(ua)) return "line";
  if (/TikTok/i.test(ua)) return "tiktok";
  // Android WebView (generic)
  if (/wv\)/.test(ua) && /Android/.test(ua)) return "generic";
  return null;
}
