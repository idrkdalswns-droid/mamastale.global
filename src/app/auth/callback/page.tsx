"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isAllowedRedirect } from "@/lib/utils/validate-redirect";
import { tc } from "@/lib/i18n/client";

/** Attempt to claim a referral code stored in sessionStorage after login */
async function claimReferralCode(accessToken: string | null) {
  try {
    const code = sessionStorage.getItem("mamastale_ref_code");
    if (!code) return;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    const res = await fetch("/api/referral", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    // Clear on success (200) or duplicate (409) — prevent infinite retries
    if (res.ok || res.status === 409) sessionStorage.removeItem("mamastale_ref_code");
  } catch { /* referral failure must never block login */ }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    // ─── 1. Capture URL BEFORE anything modifies it ───
    const callbackUrl = window.location.href;
    const searchStr = window.location.search;
    const hashStr = window.location.hash;

    // Debug info captured for error reporting only (not logged in production)

    // Parse all possible auth params from URL
    const queryParams = new URLSearchParams(searchStr);
    const code = queryParams.get("code");
    const queryError = queryParams.get("error_description") || queryParams.get("error");

    let hashAccessToken: string | null = null;
    let hashRefreshToken: string | null = null;
    let hashError: string | null = null;

    if (hashStr && hashStr.length > 1) {
      const hp = new URLSearchParams(hashStr.substring(1));
      hashAccessToken = hp.get("access_token");
      hashRefreshToken = hp.get("refresh_token");
      hashError = hp.get("error_description") || hp.get("error");
    }

    // Auth params captured: code, hashToken, error status

    // ─── 2. Check for errors in URL ───
    const urlError = queryError || hashError;
    if (urlError) {
      window.history.replaceState({}, "", "/auth/callback");
      // Google의 인앱 브라우저 차단 (403 disallowed_useragent) 또는 access_denied
      if (urlError.includes("disallowed_useragent") || urlError.includes("disallowed_user")) {
        setErrorMsg(tc("UI.auth.inAppBrowserRestricted"));
      } else {
        setErrorMsg(tc("UI.auth.loginFailed"));
      }
      setDebugInfo(urlError);
      setStatus("error");
      return;
    }

    // ─── 3. Create SSR Supabase client (for cookie-based session storage) ───
    const supabase = createClient();
    if (!supabase) {
      setErrorMsg(tc("UI.auth.serviceConnectionFailed"));
      setStatus("error");
      return;
    }

    const handleAuth = async () => {
      // Helper: check if chat state was saved before auth redirect
      const hasSavedChat = (() => {
        try {
          const raw = localStorage.getItem("mamastale_chat_state");
          if (!raw) return false;
          const snap = JSON.parse(raw);
          return Array.isArray(snap?.messages) && snap.messages.some((m: { role: string }) => m.role === "user");
        } catch { return false; }
      })();
      // Redirect destination priority: sessionStorage redirect > saved chat > home
      const savedRedirect = (() => {
        try {
          const r = sessionStorage.getItem("mamastale_redirect");
          if (r) sessionStorage.removeItem("mamastale_redirect");
          return r;
        } catch { return null; }
      })();
      const redirectUrl = (savedRedirect && isAllowedRedirect(savedRedirect))
        ? savedRedirect
        : (hasSavedChat ? "/?action=start" : "/");

      // ─── 4A. Implicit flow: hash tokens from OAuth ───
      // OAuth uses implicit flow (see oauth.ts), so tokens arrive in hash fragment.
      // We manually call setSession() on the SSR client to store them in cookies.
      if (hashAccessToken && hashRefreshToken) {
        // Implicit flow: setting session from hash tokens
        window.history.replaceState({}, "", "/auth/callback");

        const { error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });

        if (!error) {
          await claimReferralCode(hashAccessToken);
          setStatus("success");
          setTimeout(() => router.push(redirectUrl), 1500);
          return;
        }

        console.error("[AuthCallback] setSession error:", error.message);
        setErrorMsg(tc("UI.auth.loginFailed"));
        setDebugInfo(`setSession: ${error.message}`);
        setStatus("error");
        return;
      }

      // ─── 4B. PKCE flow: code from email verification ───
      // Email confirmation uses PKCE (via @supabase/ssr), so code arrives in query params.
      if (code) {
        // PKCE flow: exchanging code for session
        window.history.replaceState({}, "", "/auth/callback");

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          const { data: { session } } = await supabase.auth.getSession();
          await claimReferralCode(session?.access_token ?? null);
          setStatus("success");
          setTimeout(() => router.push(redirectUrl), 1500);
          return;
        }

        console.error("[AuthCallback] exchangeCode error:", error.message);

        const isCodeVerifierError =
          error.message.includes("code_verifier") ||
          error.message.includes("code verifier") ||
          error.message.includes("both auth code and code verifier");

        if (isCodeVerifierError) {
          setErrorMsg(tc("UI.auth.emailVerifiedInApp"));
        } else if (error.message.includes("expired") || error.message.includes("invalid")) {
          setErrorMsg(tc("UI.auth.authLinkExpired"));
        } else {
          setErrorMsg(tc("UI.auth.emailVerifiedLogin"));
        }
        setStatus("error");
        return;
      }

      // ─── 4C. Fallback: auto-detection or existing session ───
      // Poll for Supabase client's _initialize() auto-detection (up to 5s)
      // Route-Hunt Fix 12: Replace fixed 2s wait with polling for slow networks
      {
        const MAX_ATTEMPTS = 10;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          await new Promise((r) => setTimeout(r, 500));
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: { session } } = await supabase.auth.getSession();
            await claimReferralCode(session?.access_token ?? null);
            router.push(redirectUrl);
            return;
          }
        }
      }

      // Nothing worked — show error with debug info
      const debug = [
        code ? "code=YES" : "code=NO",
        hashAccessToken ? "hash=YES" : "hash=NO",
        `url=${callbackUrl.substring(0, 150)}`,
      ].join(" | ");

      console.error("[AuthCallback] All methods failed. Debug:", debug);
      setDebugInfo(debug);
      setErrorMsg(tc("UI.auth.loginFailed"));
      setStatus("error");
    };

    handleAuth();
  }, [router]);

  if (status === "success") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(127,191,176,0.15)" }}>
          <span className="text-2xl font-serif font-bold" style={{ color: "#7FBFB0" }}>M</span>
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "rgb(var(--brown))", fontFamily: "var(--font-nanum), serif" }}
        >
          로그인 완료!
        </h2>
        <p className="text-sm text-brown-light font-light">
          잠시 후 홈으로 이동합니다...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(224,122,95,0.12)" }}>
          <span className="text-2xl font-serif font-bold" style={{ color: "#E07A5F" }}>!</span>
        </div>
        <h2
          className="text-lg font-semibold mb-3"
          style={{ color: "rgb(var(--brown))", fontFamily: "var(--font-nanum), serif" }}
        >
          로그인 실패
        </h2>
        <p className="text-sm text-brown-light font-light text-center leading-relaxed mb-6 whitespace-pre-line">
          {errorMsg}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-full text-sm font-medium text-white no-underline transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          다시 로그인하기
        </Link>
        {debugInfo && process.env.NODE_ENV === "development" && (
          <p className="text-[10px] text-brown-light/40 mt-6 break-all max-w-[300px] text-center leading-relaxed select-all">
            {debugInfo}
          </p>
        )}
      </div>
    );
  }

  // R7-FIX: aria-busy + role="status" for loading state (accessibility)
  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8" aria-busy="true" role="status" aria-label="로그인 처리 중">
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ background: "rgba(127,191,176,0.15)" }}>
        <span className="text-lg font-serif font-bold" style={{ color: "#7FBFB0" }}>M</span>
      </div>
      <p className="text-sm text-brown-light font-light">로그인 처리 중...</p>
    </div>
  );
}
