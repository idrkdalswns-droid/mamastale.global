"use client";

import { useState } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      // Supabase not configured — pass through for demo
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
        } else {
          setError("로그인에 실패했습니다. 다시 시도해 주세요.");
        }
        return;
      }

      window.location.href = "/";
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "kakao" | "google") => {
    const supabase = createClient();
    if (!supabase) {
      setError("로그인 서비스를 준비 중입니다.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
        ...(provider === "kakao" && { scopes: "profile_nickname,profile_image" }),
      },
    });

    if (authError) {
      setError(provider === "kakao"
        ? "카카오 로그인에 실패했습니다. 다시 시도해 주세요."
        : "Google 로그인에 실패했습니다. 다시 시도해 주세요."
      );
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-brown mb-2">mamastale</h1>
          <p className="text-sm text-brown-light font-light">다시 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
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
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-brown-pale/20" />
          <span className="text-[11px] text-brown-pale">또는</span>
          <div className="flex-1 h-[1px] bg-brown-pale/20" />
        </div>

        <div className="space-y-3">
          <button
            disabled
            className="w-full py-3.5 rounded-full text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ background: "#FEE500", color: "#3C1E1E" }}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
                <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
              </svg>
              카카오 로그인 (준비중)
            </span>
          </button>
          <button
            disabled
            className="w-full py-3.5 rounded-full text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ background: "#fff", color: "#444", border: "1.5px solid rgba(0,0,0,0.1)" }}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google 로그인 (준비중)
            </span>
          </button>
        </div>

        <div className="text-center mt-6">
          <Link href="/signup" className="text-sm text-brown-mid font-light no-underline">
            계정이 없으신가요? <span className="text-coral font-medium">회원가입</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
