"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      // ─── CRITICAL: Capture URL params BEFORE creating Supabase client ───
      // The Supabase client auto-detects hash fragments during initialization
      // and may clear them from window.location before we can read them.
      const fullUrl = window.location.href;
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");

      // Parse hash fragment tokens (implicit flow from OAuth)
      let hashAccessToken: string | null = null;
      let hashRefreshToken: string | null = null;
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashAccessToken = hashParams.get("access_token");
        hashRefreshToken = hashParams.get("refresh_token");
      }

      // Debug logging
      console.log("[AuthCallback] URL:", fullUrl);
      console.log("[AuthCallback] code:", code, "error:", errorParam,
        "hashTokens:", !!hashAccessToken);

      // NOW create the Supabase client (after capturing URL params)
      const supabase = createClient();
      if (!supabase) {
        console.error("[AuthCallback] Supabase client unavailable — env vars missing?");
        setErrorMsg("서비스 연결에 실패했습니다.\n잠시 후 다시 시도해 주세요.");
        setStatus("error");
        return;
      }

      // ─── Handle errors forwarded from /api/auth/callback ───
      if (errorParam) {
        window.history.replaceState({}, "", "/auth/callback");

        if (errorParam === "code_verifier") {
          setErrorMsg("로그인 세션이 만료되었습니다.\n다시 로그인해 주세요.");
        } else if (errorParam === "no_code") {
          setErrorMsg("인증 정보가 올바르지 않습니다.\n다시 시도해 주세요.");
        } else {
          setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
        }
        setStatus("error");
        return;
      }

      // ─── PKCE flow: code in query params ───
      if (code) {
        window.history.replaceState({}, "", "/auth/callback");

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[AuthCallback] exchangeCode error:", exchangeError.message);

          const isCodeVerifierError =
            exchangeError.message.includes("code_verifier") ||
            exchangeError.message.includes("code verifier") ||
            exchangeError.message.includes("both auth code and code verifier");

          const isExpiredError =
            exchangeError.message.includes("expired") ||
            exchangeError.message.includes("invalid") ||
            exchangeError.message.includes("not found");

          if (isCodeVerifierError) {
            setErrorMsg(
              "이메일 인증은 완료되었습니다!\n인앱 브라우저에서 열린 것 같아요.\nSafari나 Chrome에서 로그인해 주세요."
            );
          } else if (isExpiredError) {
            setErrorMsg(
              "인증 링크가 만료되었습니다.\n로그인 페이지에서 로그인하시면\n인증 메일을 다시 받을 수 있어요."
            );
          } else {
            setErrorMsg(
              "이메일 인증은 완료되었습니다.\n로그인 페이지에서 이메일과 비밀번호로\n로그인해 주세요."
            );
          }
          setStatus("error");
          return;
        }

        setStatus("success");
        setTimeout(() => router.push("/"), 1500);
        return;
      }

      // ─── Implicit flow: tokens in hash fragment (OAuth) ───
      if (hashAccessToken && hashRefreshToken) {
        console.log("[AuthCallback] Implicit flow detected, calling setSession()");
        window.history.replaceState({}, "", "/auth/callback");

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });

        if (!sessionError) {
          setStatus("success");
          setTimeout(() => router.push("/"), 1500);
          return;
        }

        console.error("[AuthCallback] setSession error:", sessionError.message);
        setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
        setStatus("error");
        return;
      }

      // ─── Fallback: Supabase may have auto-detected hash ───
      // Wait for async initialization to complete, then check session.
      console.log("[AuthCallback] No code or hash tokens found, waiting for auto-detection...");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/");
      } else {
        console.error("[AuthCallback] No code, no hash tokens, no session. URL was:", fullUrl);
        setErrorMsg("인증 정보가 올바르지 않습니다.\n다시 시도해 주세요.");
        setStatus("error");
      }
    };

    handleCallback();
  }, [router]);

  if (status === "success") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
        <div className="text-[48px] mb-4">🌷</div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "rgb(var(--brown))", fontFamily: "'Nanum Myeongjo', serif" }}
        >
          인증이 완료되었어요!
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
        <div className="text-[48px] mb-4">📧</div>
        <h2
          className="text-lg font-semibold mb-3"
          style={{ color: "rgb(var(--brown))", fontFamily: "'Nanum Myeongjo', serif" }}
        >
          거의 다 됐어요!
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
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
      <div className="text-[48px] mb-4 animate-pulse">🌿</div>
      <p className="text-sm text-brown-light font-light">인증 처리 중...</p>
    </div>
  );
}
