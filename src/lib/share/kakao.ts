/**
 * Kakao SDK 공유 유틸리티
 * - Kakao JavaScript SDK를 동적으로 로드
 * - 카카오톡 피드 템플릿으로 공유
 */

declare global {
  interface Window {
    Kakao?: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (params: KakaoShareParams) => void;
      };
    };
  }
}

interface KakaoShareParams {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons?: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let sdkLoading: Promise<void> | null = null;

/** Kakao SDK 스크립트를 동적으로 로드 */
function loadKakaoSDK(): Promise<void> {
  if (sdkLoading) return sdkLoading;

  if (window.Kakao) {
    sdkLoading = Promise.resolve();
    return sdkLoading;
  }

  sdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkLoading = null; // LAUNCH-FIX R2: Allow retry on network failure
      reject(new Error("Kakao SDK 로드 실패"));
    };
    document.head.appendChild(script);
  });

  return sdkLoading;
}

/** Kakao SDK 초기화 */
function initKakao(): boolean {
  if (!window.Kakao) return false;
  if (!KAKAO_JS_KEY) return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
  }
  return window.Kakao.isInitialized();
}

/** 카카오톡으로 동화 공유 */
export async function shareToKakao(params: {
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
}): Promise<boolean> {
  try {
    await loadKakaoSDK();
    if (!initKakao()) {
      console.warn("[Kakao] SDK 초기화 실패 — JS Key를 확인하세요");
      return false;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const defaultImage = `${origin}/images/hero.jpg`;

    window.Kakao!.Share.sendDefault({
      objectType: "feed",
      content: {
        title: params.title,
        description: params.description || "엄마가 만든 세상에 하나뿐인 동화",
        imageUrl: params.imageUrl || defaultImage,
        link: {
          mobileWebUrl: params.url,
          webUrl: params.url,
        },
      },
      buttons: [
        {
          title: "동화 읽어보기",
          link: {
            mobileWebUrl: params.url,
            webUrl: params.url,
          },
        },
      ],
    });

    return true;
  } catch (err) {
    console.error("[Kakao] 공유 실패:", err);
    return false;
  }
}
