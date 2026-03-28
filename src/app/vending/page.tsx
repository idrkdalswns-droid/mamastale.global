"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { VendingMachine } from "@/components/vending/VendingMachine";
import Link from "next/link";

export default function VendingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brown-pale/30 border-t-brown rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-6">
        <div className="w-full max-w-[340px] text-center">
          <h1 className="font-serif text-xl font-bold text-brown mb-3">입소문 자판기</h1>
          <p className="text-sm text-brown-light font-light mb-6 break-keep">
            로그인하면 추천 코드를 받고 무료 티켓을 얻을 수 있어요.
          </p>
          <Link
            href="/login?redirect=/vending"
            className="inline-block w-full py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)", boxShadow: "0 6px 20px rgba(224,122,95,0.3)" }}
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return <VendingMachine />;
}
