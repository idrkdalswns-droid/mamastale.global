"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signInWithOAuth, type OAuthProvider } from "@/lib/auth/oauth";
import { trackSignUp } from "@/lib/utils/analytics";
import { detectInAppBrowser, openExternalBrowser, type InAppBrowser } from "@/lib/utils/browser-detect";

interface OAuthButtonsProps {
  /** Additional CSS class for the wrapper */
  className?: string;
  /** Disable buttons (e.g. while email form is submitting) */
  disabled?: boolean;
  /** Called BEFORE OAuth redirect — use to save chat state */
  onBeforeRedirect?: () => void;
}

export function OAuthButtons({ className = "", disabled = false, onBeforeRedirect }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inApp, setInApp] = useState<InAppBrowser>(null);

  // 마운트 시 인앱 브라우저 자동 감지
  useEffect(() => {
    setInApp(detectInAppBrowser());
  }, []);

  const handleOAuth = async (provider: OAuthProvider) => {
    if (loading || disabled) return;
    setLoading(provider);
    setErrorMsg(null);
    // CRITICAL: Save chat state BEFORE browser redirects to OAuth provider
    onBeforeRedirect?.();
    trackSignUp(provider);
    const result = await signInWithOAuth(provider);
    if (result.error) {
      setErrorMsg(result.error);
      setLoading(null);
      return;
    }
    // Browser will redirect; loading state only matters if redirect fails
    setTimeout(() => setLoading(null), 15000);
  };

  const handleOpenExternal = () => {
    const url = window.location.href;
    const opened = openExternalBrowser(url);
    if (!opened) {
      // fallback: 클립보드 복사
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setErrorMsg("URL이 복사되었습니다.\nSafari나 Chrome에서 붙여넣기 해주세요.");
    }).catch(() => {
      setErrorMsg("Safari나 Chrome에서\nmamastale.com 을 직접 입력해주세요.");
    });
  };

  // 인앱 브라우저 이름 (한국어)
  const inAppName = inApp === "kakao" ? "카카오톡" :
    inApp === "naver" ? "네이버" :
    inApp === "instagram" ? "인스타그램" :
    inApp === "facebook" ? "페이스북" :
    inApp === "line" ? "라인" :
    inApp === "tiktok" ? "틱톡" :
    inApp ? "인앱 브라우저" : null;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 인앱 브라우저 감지 시 — 외부 브라우저 안내 (마운트 시 자동 표시) */}
      {inApp ? (
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(224,122,95,0.08)",
            border: "1px solid rgba(224,122,95,0.15)",
          }}
        >
          <p className="text-xs text-brown font-medium mb-1.5">
            {inAppName}에서는 Google 로그인을 사용할 수 없어요
          </p>
          <p className="text-[11px] text-brown-light font-light mb-3 break-keep">
            카카오 로그인을 이용하거나, 외부 브라우저에서 열어주세요
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={handleOpenExternal}
              className="px-4 py-2 rounded-full text-xs font-medium text-white transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
            >
              외부 브라우저로 열기
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(196,149,106,0.25)",
                color: "#5A3E2B",
              }}
            >
              링크 복사
            </button>
          </div>
        </div>
      ) : errorMsg === "inapp_google" ? (
        /* 감지 실패했지만 Google OAuth에서 거부된 경우 (fallback) */
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(224,122,95,0.08)",
            border: "1px solid rgba(224,122,95,0.15)",
          }}
        >
          <p className="text-xs text-brown font-medium mb-1.5">
            인앱 브라우저에서는 Google 로그인을 사용할 수 없어요
          </p>
          <p className="text-[11px] text-brown-light font-light mb-3 break-keep">
            카카오 로그인을 이용하거나, Safari/Chrome에서 열어주세요
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-full text-xs font-medium text-white transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
          >
            링크 복사하기
          </button>
        </div>
      ) : errorMsg ? (
        <p className="text-xs text-red-500 text-center whitespace-pre-line" role="alert">
          {errorMsg}
        </p>
      ) : null}

      <p className="text-[10px] text-brown-pale font-light text-center break-keep">
        로그인 시{" "}
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline">이용약관</Link> 및{" "}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">개인정보처리방침</Link>에 동의합니다.
      </p>
      {/* Kakao Login Button — Official branding: yellow bg, dark brown text */}
      <button
        type="button"
        onClick={() => handleOAuth("kakao")}
        disabled={!!loading || disabled}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
        style={{
          background: "#FEE500",
          color: "#3C1E1E",
        }}
      >
        {/* Kakao icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
          <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z" />
        </svg>
        {loading === "kakao" ? "연결 중..." : "카카오로 시작하기"}
      </button>

      {/* Google Login Button — 인앱 브라우저에서는 숨김 */}
      {!inApp && (
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={!!loading || disabled}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1.5px solid rgba(196,149,106,0.2)",
            color: "#444",
          }}
        >
          {/* Google G icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading === "google" ? "연결 중..." : "Google로 시작하기"}
        </button>
      )}
    </div>
  );
}
