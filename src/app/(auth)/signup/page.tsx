"use client";

import { useState } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<"" | "sending" | "sent" | "error">("");

  const handleResendVerification = async () => {
    if (!email || resendStatus === "sending") return;
    setResendStatus("sending");
    try {
      const supabase = createClient();
      if (!supabase) { setResendStatus("error"); return; }
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (resendErr) {
        console.error("[Signup] Resend error:", resendErr.message);
        setResendStatus("error");
      } else {
        setResendStatus("sent");
      }
    } catch { setResendStatus("error"); }
  };

  // OAuth signup handlers — to be enabled when Kakao/Google providers are configured
  // const handleOAuthSignup = async (provider: "kakao" | "google") => { ... };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowResend(false);
    setResendStatus("");

    const supabase = createClient();
    if (!supabase) {
      setError("서비스 연결에 실패했습니다. 페이지를 새로고침해 주세요.");
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.error("[Signup] Error:", authError.message, authError.status);

        if (authError.message.includes("already registered")) {
          setError("이미 가입된 이메일입니다. 로그인을 시도해 주세요.");
        } else if (authError.message.includes("password")) {
          setError("비밀번호는 6자 이상이어야 합니다.");
        } else if (
          authError.message.includes("rate") ||
          authError.message.includes("limit") ||
          authError.message.includes("exceeded") ||
          authError.status === 429
        ) {
          setError("요청이 너무 많습니다. 1~2분 후 다시 시도해 주세요.");
        } else if (
          authError.message.includes("not authorized") ||
          authError.message.includes("Signups not allowed") ||
          authError.message.includes("disabled")
        ) {
          setError("현재 회원가입이 비활성화되어 있습니다.");
        } else if (authError.message.includes("invalid") || authError.message.includes("email")) {
          setError("올바른 이메일 주소를 입력해 주세요.");
        } else {
          setError(`회원가입에 실패했습니다. (${authError.message})`);
        }
        return;
      }

      // FIX: Supabase returns fake success for already-registered users
      // (to prevent email enumeration). Check identities to detect this.
      if (
        data?.user &&
        (!data.user.identities || data.user.identities.length === 0)
      ) {
        console.warn("[Signup] User already exists (identities empty):", trimmedEmail);
        setError("이미 가입된 이메일입니다. 로그인을 시도하시거나, 아래에서 인증 메일을 다시 받아보세요.");
        setShowResend(true);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("[Signup] Unexpected error:", err);
      setError("회원가입에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4" style={{ color: "#E07A5F" }}>&#9993;</div>
          <h2 className="font-serif text-xl text-brown font-semibold mb-3">
            이메일을 확인해 주세요
          </h2>
          <p className="text-sm text-brown-light font-light leading-relaxed mb-2">
            <strong>{email}</strong>로 인증 메일을 보내드렸습니다.
            <br />
            메일의 링크를 클릭하시면 가입이 완료됩니다.
          </p>
          <p className="text-[11px] text-brown-pale font-light leading-relaxed mb-4">
            💡 메일이 보이지 않으면 스팸함을 확인해 주세요.
            <br />
            인증 링크는 같은 브라우저(Safari/Chrome)에서 열어주세요.
          </p>

          {/* Resend button on success screen too */}
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendStatus === "sending" || resendStatus === "sent"}
            className="w-full max-w-xs mx-auto text-xs text-center font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 mb-4"
            style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}
          >
            {resendStatus === "sent"
              ? "✓ 인증 메일을 다시 보냈습니다"
              : resendStatus === "sending"
              ? "전송 중..."
              : resendStatus === "error"
              ? "전송 실패 — 다시 시도"
              : "인증 메일 다시 보내기"}
          </button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-full text-sm font-medium text-white no-underline"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-brown mb-2">mamastale</h1>
          <p className="text-sm text-brown-light font-light">새로운 여정을 시작하세요</p>
        </div>

        <p className="text-[11px] text-brown-pale font-light text-center mb-4">
          카카오 · Google 회원가입은 곧 지원됩니다
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (별명도 괜찮아요)"
            aria-label="이름"
            className="w-full px-4 py-3.5 rounded-2xl text-sm font-sans outline-none"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1.5px solid rgba(196,149,106,0.15)",
              color: "#444",
            }}
            required
          />
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
            placeholder="비밀번호 (6자 이상)"
            aria-label="비밀번호"
            minLength={6}
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
              onClick={handleResendVerification}
              disabled={resendStatus === "sending" || resendStatus === "sent"}
              className="w-full text-xs text-center font-medium py-2.5 rounded-xl transition-all disabled:opacity-50"
              style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}
            >
              {resendStatus === "sent"
                ? "✓ 인증 메일을 다시 보냈습니다"
                : resendStatus === "sending"
                ? "전송 중..."
                : resendStatus === "error"
                ? "전송 실패 — 다시 시도"
                : "인증 메일 다시 보내기"}
            </button>
          )}

          {/* GR-6: Affirmative consent checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-coral"
              required
            />
            <span className="text-[11px] text-brown-light leading-relaxed">
              <Link href="/terms" className="underline">이용약관</Link> 및{" "}
              <Link href="/privacy" className="underline">개인정보처리방침</Link>에
              동의합니다. 대화 내용이 AI 동화 생성을 위해 처리됨을 이해합니다.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !consent}
            className="w-full py-3.5 rounded-full text-white text-sm font-medium active:scale-[0.97] transition-transform disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {loading ? "가입 중..." : "무료로 시작하기"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-brown-mid font-light no-underline">
            이미 계정이 있으신가요? <span className="text-coral font-medium">로그인</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
