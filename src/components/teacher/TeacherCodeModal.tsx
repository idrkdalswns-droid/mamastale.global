"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface TeacherCodeModalProps {
  onVerified: (data: {
    sessionId: string;
    kindergartenName: string;
    expiresAt: string;
    currentPhase: string;
    turnCount: number;
    isExisting: boolean;
  }) => void;
}

export function TeacherCodeModal({ onVerified }: TeacherCodeModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("코드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/teacher/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "코드 검증에 실패했습니다.");
        return;
      }

      onVerified(data);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6">
      <div className="w-full max-w-sm">
        {/* 아이콘 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 relative rounded-xl overflow-hidden mx-auto mb-3">
            <Image src="/images/teacher/icon/key.jpeg" alt="접근 코드" fill className="object-cover" sizes="64px" />
          </div>
          <h1 className="text-xl font-semibold text-brown">
            선생님 접근 코드
          </h1>
          <p className="text-sm text-brown-light mt-2 break-keep">
            유치원/어린이집에서 받으신 코드를 입력해주세요
          </p>
        </div>

        {/* 코드 입력 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="예: HANA-2024"
            maxLength={30}
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-xl border border-brown-pale/30
                       text-center text-lg font-medium tracking-wider
                       text-brown placeholder:text-brown-pale/50
                       focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50
                       disabled:opacity-50 bg-paper"
            style={{ fontSize: "16px" }} // 모바일 줌 방지
          />

          {error && (
            <p className="text-sm text-red-500 text-center break-keep">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !code.trim()}
            className="w-full py-3.5 rounded-full text-white text-[15px] font-medium
                       transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
            }}
          >
            {isSubmitting ? "확인 중..." : "입장하기"}
          </button>
        </form>

        {/* 안내 */}
        <p className="text-[11px] text-brown-pale text-center mt-6 break-keep">
          코드가 없으시다면 소속 기관 관리자에게 문의해주세요
        </p>
      </div>
    </div>
  );
}
