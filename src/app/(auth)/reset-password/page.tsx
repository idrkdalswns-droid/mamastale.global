"use client";

import { useState } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("서비스를 사용할 수 없습니다.");
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/auth/callback` }
      );

      if (resetError) {
        setError("이메일 전송에 실패했습니다. 올바른 이메일인지 확인해 주세요.");
      } else {
        setSent(true);
      }
    } catch {
      setError("요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-brown mb-2">mamastale</h1>
          <p className="text-sm text-brown-light font-light">비밀번호 재설정</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="font-serif text-lg text-brown font-bold mb-3">
              이메일을 확인해 주세요
            </h2>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-6 break-keep">
              <span className="font-medium text-brown">{email}</span>으로
              비밀번호 재설정 링크를 보내드렸어요.
              <br />
              받은 편지함을 확인해 주세요.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-full text-sm font-medium text-brown-mid no-underline"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-brown-light font-light text-center mb-6 break-keep">
              가입하신 이메일을 입력하시면
              <br />
              비밀번호 재설정 링크를 보내드려요.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
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

              {error && <p className="text-xs text-coral text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-white text-sm font-medium active:scale-[0.97] transition-transform"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                  boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                }}
              >
                {loading ? "전송 중..." : "재설정 링크 보내기"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login" className="text-sm text-brown-mid font-light no-underline">
                ← 로그인으로 돌아가기
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
