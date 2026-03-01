"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      if (!supabase) {
        router.push("/");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Auth callback error:", exchangeError.name);
          setError(true);
          setTimeout(() => router.push("/login"), 2000);
          return;
        }
      }

      // Success — redirect to home
      router.push("/");
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
        <div className="text-[48px] mb-4">😔</div>
        <p className="text-sm text-brown-light font-light text-center">
          로그인에 실패했습니다.<br />잠시 후 다시 시도해 주세요...
        </p>
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
