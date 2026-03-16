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

/**
 * 인앱 브라우저에서 외부 브라우저(Safari/Chrome)로 URL을 여는 유틸리티.
 *
 * 각 앱별 커스텀 스킴을 사용하며, 지원되지 않는 앱은 false 반환.
 * - 카카오톡: kakaotalk://web/openExternal
 * - 네이버: naversearchapp://openExternal (Android only)
 * - 페이스북/인스타그램: intent:// (Android) / 불가 (iOS)
 * - 라인: line://external
 */
export function openExternalBrowser(url: string): boolean {
  const browser = detectInAppBrowser();
  if (!browser) return false;

  const encoded = encodeURIComponent(url);
  const isAndroid = /Android/i.test(navigator.userAgent);

  try {
    switch (browser) {
      case "kakao":
        // 카카오톡 인앱 → 외부 브라우저
        window.location.href = `kakaotalk://web/openExternal?url=${encoded}`;
        return true;

      case "naver":
        if (isAndroid) {
          // 네이버 앱 Android
          window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
          return true;
        }
        // iOS 네이버는 직접 외부 열기 불가 → false (링크 복사로 fallback)
        return false;

      case "line":
        window.location.href = `line://app/open-external-browser?url=${encoded}`;
        return true;

      case "facebook":
      case "instagram":
      case "tiktok":
        if (isAndroid) {
          window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
          return true;
        }
        // iOS에서는 직접 외부 열기 불가
        return false;

      default:
        if (isAndroid) {
          window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
          return true;
        }
        return false;
    }
  } catch {
    return false;
  }
}
