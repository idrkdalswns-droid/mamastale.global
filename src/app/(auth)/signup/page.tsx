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

  // OAuth signup handlers — to be enabled when Kakao/Google providers are configured
  // const handleOAuthSignup = async (provider: "kakao" | "google") => { ... };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      window.location.href = "/";
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("이미 가입된 이메일입니다. 로그인을 시도해 주세요.");
        } else if (authError.message.includes("password")) {
          setError("비밀번호는 6자 이상이어야 합니다.");
        } else {
          setError("회원가입에 실패했습니다. 다시 시도해 주세요.");
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError("회원가입에 실패했습니다. 다시 시도해 주세요.");
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
          <p className="text-sm text-brown-light font-light leading-relaxed mb-6">
            <strong>{email}</strong>로 인증 메일을 보내드렸습니다.
            <br />
            메일의 링크를 클릭하시면 가입이 완료됩니다.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-full text-sm font-medium text-white no-underline"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
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
