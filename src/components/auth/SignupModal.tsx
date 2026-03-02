"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SignupModalProps {
  onClose: () => void;
}

export function SignupModal({ onClose }: SignupModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<"" | "sending" | "sent" | "error">("");
  const [verificationScreen, setVerificationScreen] = useState(false);

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
        setResendStatus("error");
      } else {
        setResendStatus("sent");
      }
    } catch { setResendStatus("error"); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowResend(false);
    setResendStatus("");

    const supabase = createClient();
    if (!supabase) {
      setError("서비스 연결에 실패했습니다.");
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

      // Supabase returns fake success for already-registered users
      if (
        data?.user &&
        (!data.user.identities || data.user.identities.length === 0)
      ) {
        setError("이미 가입된 이메일입니다. 로그인을 시도하시거나, 아래에서 인증 메일을 다시 받아보세요.");
        setShowResend(true);
        return;
      }

      // Session returned immediately (email confirm disabled) → close modal
      // useAuth's onAuthStateChange will auto-detect and re-render
      if (data?.session) {
        onClose();
        return;
      }

      // Email verification needed → show in-modal verification screen
      setVerificationScreen(true);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="회원가입"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 max-h-[90dvh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-400"
        style={{
          background: "linear-gradient(180deg, #FFF9F5, #FFFFFF)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
        }}
      >
        {verificationScreen ? (
          /* ── Email verification screen ── */
          <div className="text-center py-2">
            <div className="text-4xl mb-3" style={{ color: "#E07A5F" }}>&#9993;</div>
            <h3 className="font-serif text-lg font-bold text-brown mb-2">
              이메일을 확인해 주세요
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-2 break-keep">
              <strong>{email}</strong>로 인증 메일을 보내드렸습니다.
              <br />
              메일의 링크를 클릭하시면 가입이 완료됩니다.
            </p>
            <p className="text-[11px] text-brown-pale font-light leading-relaxed mb-4 break-keep">
              메일이 보이지 않으면 스팸함을 확인해 주세요.
              <br />
              인증 링크는 같은 브라우저에서 열어주세요.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendStatus === "sending" || resendStatus === "sent"}
              className="w-full text-xs text-center font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 mb-3"
              style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}
            >
              {resendStatus === "sent"
                ? "인증 메일을 다시 보냈습니다"
                : resendStatus === "sending"
                ? "전송 중..."
                : resendStatus === "error"
                ? "전송 실패 — 다시 시도"
                : "인증 메일 다시 보내기"}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-light text-brown-pale transition-all"
            >
              닫기
            </button>
          </div>
        ) : (
          /* ── Signup form ── */
          <>
            {/* Handle bar for mobile bottom sheet */}
            <div className="flex justify-center mb-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-brown-pale/30" />
            </div>

            <div className="text-center mb-5">
              <h3 className="font-serif text-lg font-bold text-brown mb-1.5 leading-tight">
                이야기가 깊어지고 있어요
              </h3>
              <p className="text-xs text-brown-light font-light leading-relaxed break-keep">
                회원가입 후 <span className="text-coral font-medium">이 대화를 그대로 이어서</span><br />
                나만의 마음 동화를 완성할 수 있어요.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 (별명도 괜찮아요)"
                aria-label="이름"
                className="w-full px-4 py-3 rounded-2xl text-sm font-sans outline-none"
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
                className="w-full px-4 py-3 rounded-2xl text-sm font-sans outline-none"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "1.5px solid rgba(196,149,106,0.15)",
                  color: "#444",
                }}
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  aria-label="비밀번호"
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-sm font-sans outline-none"
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    border: "1.5px solid rgba(196,149,106,0.15)",
                    color: "#444",
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-brown-pale font-light min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? "숨기기" : "보기"}
                </button>
              </div>

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
                    ? "인증 메일을 다시 보냈습니다"
                    : resendStatus === "sending"
                    ? "전송 중..."
                    : resendStatus === "error"
                    ? "전송 실패 — 다시 시도"
                    : "인증 메일 다시 보내기"}
                </button>
              )}

              {/* Consent checkbox */}
              <label
                className="flex items-start gap-2.5 cursor-pointer rounded-2xl px-3.5 py-3 transition-all"
                style={{
                  background: consent ? "rgba(224,122,95,0.08)" : "rgba(255,255,255,0.5)",
                  border: consent ? "1.5px solid rgba(224,122,95,0.3)" : "1.5px solid rgba(196,149,106,0.15)",
                }}
              >
                <div
                  className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all"
                  style={{
                    background: consent ? "#E07A5F" : "rgba(255,255,255,0.8)",
                    border: consent ? "none" : "1.5px solid rgba(196,149,106,0.25)",
                  }}
                >
                  {consent && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="sr-only"
                  required
                />
                <span className="text-[11px] text-brown-light leading-relaxed">
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline">이용약관</Link> 및{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">개인정보처리방침</Link>에
                  동의합니다.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !consent}
                className="w-full py-3.5 rounded-full text-white text-sm font-medium active:scale-[0.97] transition-transform"
                style={{
                  background: consent
                    ? "linear-gradient(135deg, #E07A5F, #C96B52)"
                    : "rgba(196,149,106,0.3)",
                  boxShadow: consent
                    ? "0 6px 20px rgba(224,122,95,0.3)"
                    : "none",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "가입 중..." : "회원가입하고 이어서 만들기"}
              </button>
            </form>

            <div className="text-center mt-3">
              <button
                onClick={onClose}
                className="text-xs font-light text-brown-pale"
              >
                나중에 할게요
              </button>
            </div>

            <p className="text-[10px] text-brown-pale font-light text-center mt-2">
              대화 내용은 안전하게 보관됩니다
            </p>
          </>
        )}
      </div>
    </div>
  );
}
