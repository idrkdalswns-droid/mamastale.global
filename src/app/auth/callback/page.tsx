"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
      setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
      setDebugInfo(urlError);
      setStatus("error");
      return;
    }

    // ─── 3. Create SSR Supabase client (for cookie-based session storage) ───
    const supabase = createClient();
    if (!supabase) {
      setErrorMsg("서비스 연결에 실패했습니다.\n잠시 후 다시 시도해 주세요.");
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
      // Redirect destination: if chat was saved, go to /?action=start to auto-restore
      const redirectUrl = hasSavedChat ? "/?action=start" : "/";

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
          setStatus("success");
          setTimeout(() => router.push(redirectUrl), 1500);
          return;
        }

        console.error("[AuthCallback] setSession error:", error.message);
        setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
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
          setErrorMsg("이메일 인증은 완료되었습니다!\n인앱 브라우저에서 열린 것 같아요.\nSafari나 Chrome에서 로그인해 주세요.");
        } else if (error.message.includes("expired") || error.message.includes("invalid")) {
          setErrorMsg("인증 링크가 만료되었습니다.\n로그인 페이지에서 다시 시도해 주세요.");
        } else {
          setErrorMsg("이메일 인증은 완료되었습니다.\n로그인 페이지에서 로그인해 주세요.");
        }
        setStatus("error");
        return;
      }

      // ─── 4C. Fallback: auto-detection or existing session ───
      // Wait for Supabase client's _initialize() auto-detection to complete
      // No code or hash tokens — waiting for auto-detection
      await new Promise((r) => setTimeout(r, 2000));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push(redirectUrl);
        return;
      }

      // Nothing worked — show error with debug info
      const debug = [
        code ? "code=YES" : "code=NO",
        hashAccessToken ? "hash=YES" : "hash=NO",
        `url=${callbackUrl.substring(0, 150)}`,
      ].join(" | ");

      console.error("[AuthCallback] All methods failed. Debug:", debug);
      setDebugInfo(debug);
      setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
      setStatus("error");
    };

    handleAuth();
  }, [router]);

  if (status === "success") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
        <div className="text-[48px] mb-4">🌷</div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "rgb(var(--brown))", fontFamily: "'Nanum Myeongjo', serif" }}
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
        <div className="text-[48px] mb-4">😔</div>
        <h2
          className="text-lg font-semibold mb-3"
          style={{ color: "rgb(var(--brown))", fontFamily: "'Nanum Myeongjo', serif" }}
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
        {debugInfo && (
          <p className="text-[10px] text-brown-light/40 mt-6 break-all max-w-[300px] text-center leading-relaxed select-all">
            {debugInfo}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
      <div className="text-[48px] mb-4 animate-pulse">🌿</div>
      <p className="text-sm text-brown-light font-light">로그인 처리 중...</p>
    </div>
  );
}
