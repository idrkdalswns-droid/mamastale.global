"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  return (
    <>
      <OAuthButtons
        disabled={false}
        onBeforeRedirect={() => {
          // Preserve any saved chat state
        }}
      />

      <div className="text-center mt-6 space-y-3">
        <Link href="/signup" className="block text-sm text-brown-mid font-light no-underline">
          아직 계정이 없으신가요? <span className="text-coral font-medium">회원가입</span>
        </Link>
        <Link href="/" className="block text-sm text-brown-pale font-light no-underline">
          ← 홈으로 돌아가기
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
          <p className="text-sm text-brown-light font-light mb-1">다시 오셨군요, 반갑습니다</p>
          <p className="text-[11px] text-brown-pale font-light">로그인하고 나만의 동화를 이어서 만들어보세요</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
