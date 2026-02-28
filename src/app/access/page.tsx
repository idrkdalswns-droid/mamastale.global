"use client";

import { useState } from "react";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";

export default function AccessPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        setError(data.error || "보안 키가 올바르지 않습니다.");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="font-serif text-2xl font-bold text-brown mb-2">mamastale</h1>
        <p className="text-sm text-brown-light font-light leading-relaxed mb-8">
          서비스 이용을 위해 보안 키를 입력해 주세요
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="보안 키 입력"
            className="w-full px-4 py-3.5 rounded-2xl text-sm font-sans outline-none text-center tracking-widest"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1.5px solid rgba(196,149,106,0.15)",
              color: "#444",
            }}
            required
            autoFocus
          />

          {error && <p className="text-xs text-coral">{error}</p>}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3.5 rounded-full text-white text-sm font-medium active:scale-[0.97] transition-transform disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #D4836B)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            {loading ? "확인 중..." : "입장하기"}
          </button>
        </form>

        <p className="text-[11px] text-brown-pale mt-6">
          수업 참가자에게 안내된 보안 키를 입력해 주세요
        </p>
      </div>
    </div>
  );
}
