"use client";

import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export default function SignupPage() {
  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-8 py-12 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={60} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl font-bold text-brown mb-2">mamastale</h1>
          <p className="text-sm text-brown-light font-light mb-4">새로운 여정을 시작하세요</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-brown-mid font-medium">
            <span>나만의 동화</span>
            <span>영구 보관</span>
            <span>커뮤니티</span>
          </div>
        </div>

        <OAuthButtons disabled={false} />

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-brown-mid font-light no-underline">
            이미 계정이 있으신가요? <span className="text-coral font-medium">로그인</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
