"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<"" | "sending" | "sent" | "error">("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      window.location.href = "/";
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("이메일 인증이 필요합니다. 받은 편지함을 확인해 주세요.");
          setShowResend(true);
        } else {
          setError("로그인에 실패했습니다. 다시 시도해 주세요.");
        }
        return;
      }

      // Redirect to original page (or home) after login
      // Security: block protocol-relative URLs (//evil.com) to prevent open redirect
      const safe = redirectTo.startsWith("/") && !redirectTo.startsWith("//");
      window.location.href = safe ? redirectTo : "/";
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          aria-label="이메일"
          className="w-full px-4 py-3.5 rounded-2xl text-sm font-sans outline-none"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1.5px solid rgba(196,149,106,0.15)",
            color: "#444",
          }}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          aria-label="비밀번호"
          className="w-full px-4 py-3.5 rounded-2xl text-sm font-sans outline-none"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1.5px solid rgba(196,149,106,0.15)",
            color: "#444",
          }}
          required
        />

        {error && <p className="text-xs text-coral text-center">{error}</p>}
        {showResend && (
          <button
            type="button"
            onClick={async () => {
              if (!email || resendStatus === "sending") return;
              setResendStatus("sending");
              try {
                const supabase = createClient();
                if (!supabase) return;
                const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
                setResendStatus(resendErr ? "error" : "sent");
              } catch { setResendStatus("error"); }
            }}
            disabled={resendStatus === "sending" || resendStatus === "sent"}
            className="w-full text-xs text-center font-medium py-2 rounded-xl transition-all disabled:opacity-50"
            style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}
          >
            {resendStatus === "sent" ? "✓ 인증 메일을 다시 보냈습니다" : resendStatus === "sending" ? "전송 중..." : "인증 메일 다시 보내기"}
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-full text-white text-sm font-medium active:scale-[0.97] transition-transform"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-[1px] bg-brown-pale/20" />
        <span className="text-[11px] text-brown-pale">또는</span>
        <div className="flex-1 h-[1px] bg-brown-pale/20" />
      </div>

      <p className="text-[11px] text-brown-pale font-light text-center">
        카카오 · Google 로그인은 곧 지원됩니다
      </p>

      <div className="text-center mt-4">
        <Link href="/reset-password" className="text-xs text-brown-pale font-light no-underline">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="text-center mt-4">
        <Link href="/signup" className="text-sm text-brown-mid font-light no-underline">
          계정이 없으신가요? <span className="text-coral font-medium">회원가입</span>
        </Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 py-12 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-brown mb-2">mamastale</h1>
          <p className="text-sm text-brown-light font-light">다시 오신 것을 환영합니다</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
