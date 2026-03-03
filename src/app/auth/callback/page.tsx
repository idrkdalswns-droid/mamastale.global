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
    // ─── 1. Capture FULL URL before anything modifies it ───
    const callbackUrl = window.location.href;
    const searchStr = window.location.search;
    const hashStr = window.location.hash;

    console.log("[AuthCallback] URL:", callbackUrl);
    console.log("[AuthCallback] search:", searchStr, "hash:", hashStr ? hashStr.substring(0, 80) + "..." : "(none)");

    // ─── 2. Check for explicit error in URL (Supabase OAuth failures) ───
    const params = new URLSearchParams(searchStr);
    let urlError = params.get("error_description") || params.get("error");

    if (!urlError && hashStr) {
      const hp = new URLSearchParams(hashStr.substring(1));
      urlError = hp.get("error_description") || hp.get("error");
    }

    if (urlError) {
      console.error("[AuthCallback] Error from Supabase:", urlError);
      window.history.replaceState({}, "", "/auth/callback");
      setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
      setDebugInfo(urlError);
      setStatus("error");
      return;
    }

    // ─── 3. Create Supabase client ───
    // _initialize() auto-detects auth params in the URL:
    //   - PKCE: ?code=XXX → exchanges code for session
    //   - Implicit: #access_token=XXX → sets session from hash tokens
    // We do NOT manually parse or exchange — let the client handle it
    // to avoid race conditions with auto-detection.
    const supabase = createClient();
    if (!supabase) {
      setErrorMsg("서비스 연결에 실패했습니다.\n잠시 후 다시 시도해 주세요.");
      setStatus("error");
      return;
    }

    let resolved = false;

    // ─── 4. Listen for auth state changes ───
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: unknown) => {
        console.log("[AuthCallback] onAuthStateChange:", event, "session:", !!session);

        if (resolved) return;

        // Session established — success!
        if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
          resolved = true;
          subscription.unsubscribe();
          clearTimeout(timeout);
          window.history.replaceState({}, "", "/auth/callback");
          setStatus("success");
          setTimeout(() => router.push("/"), 1500);
        }
      }
    );

    // ─── 5. Timeout: no session within 5s → show error + debug URL ───
    const timeout = setTimeout(async () => {
      if (resolved) return;

      // One final attempt
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          resolved = true;
          subscription.unsubscribe();
          router.push("/");
          return;
        }
      } catch {
        /* ignore */
      }

      resolved = true;
      subscription.unsubscribe();

      // Build debug info for display
      const hasCode = searchStr.includes("code=");
      const hasHash = hashStr.length > 1;
      const debug = [
        hasCode ? "code=YES" : "code=NO",
        hasHash ? "hash=YES" : "hash=NO",
        `url=${callbackUrl.substring(0, 120)}`,
      ].join(" | ");

      setDebugInfo(debug);
      setErrorMsg("로그인에 실패했습니다.\n다시 시도해 주세요.");
      setStatus("error");
    }, 5000);

    // Cleanup on unmount
    return () => {
      resolved = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
