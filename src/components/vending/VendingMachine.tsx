"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetchOnce } from "@/lib/utils/auth-fetch";
import { tc } from "@/lib/i18n/client";
import toast from "react-hot-toast";
import Link from "next/link";

interface ReferralData {
  code: string;
  referralCount: number;
  ticketsEarned: number;
  maxReferrals: number;
  remainingReferrals: number;
  shareUrl: string;
}

export function VendingMachine() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await authFetchOnce("/api/referral");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClaim = async () => {
    const code = claimCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      toast.error(tc("UI.referral.enterCode"));
      return;
    }
    setClaiming(true);
    try {
      const res = await authFetchOnce("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || tc("UI.referral.rewardGrantedFallback"));
        setClaimCode("");
        fetchData(); // refresh stats
      } else {
        toast.error(result.error || tc("UI.common.genericError"));
      }
    } catch {
      toast.error(tc("UI.common.networkError"));
    } finally {
      setClaiming(false);
    }
  };

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      toast.success(tc("UI.common.copySuccess"));
    } catch {
      // fallback
      toast.error(tc("UI.common.copyFailed"));
    }
  };

  const handleShare = async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "mamastale — 무료 동화 티켓",
          text: `이 링크로 가입하면 서로 무료 동화 티켓 1장씩! 추천 코드: ${data.code}`,
          url: data.shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brown-pale/30 border-t-brown rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream px-5 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-2xl font-bold text-brown mb-2">입소문 자판기</h1>
        <p className="text-sm text-brown-light font-light break-keep">
          친구에게 알려주면 서로 티켓 1장씩!
        </p>
      </div>

      {/* My referral code */}
      {data && (
        <section className="mb-6">
          <p className="text-[11px] text-brown-pale font-light mb-2">내 추천 코드</p>
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.15)" }}
          >
            <p className="font-mono text-2xl font-bold text-brown tracking-[0.25em] mb-4">
              {data.code}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 min-h-[44px] rounded-full text-[13px] font-medium text-brown transition-all active:scale-[0.97]"
                style={{ border: "1.5px solid rgba(196,168,130,0.25)" }}
              >
                링크 복사
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 min-h-[44px] rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                공유하기
              </button>
            </div>
            <p className="text-[11px] text-brown-pale font-light mt-3">
              남은 추천: {data.remainingReferrals}/{data.maxReferrals}
            </p>
          </div>
        </section>
      )}

      {/* Claim code */}
      <section className="mb-6">
        <p className="text-[11px] text-brown-pale font-light mb-2">추천 코드 입력</p>
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(196,168,130,0.06)", border: "1.5px solid rgba(196,168,130,0.12)" }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="친구의 코드 입력"
              maxLength={8}
              className="flex-1 px-4 py-2.5 min-h-[44px] rounded-full text-sm text-brown bg-white border border-brown-pale/20 outline-none focus:border-coral/40 transition-colors font-mono tracking-wider text-center"
              onKeyDown={(e) => { if (e.key === "Enter") handleClaim(); }}
            />
            <button
              onClick={handleClaim}
              disabled={claiming || !claimCode.trim()}
              className="px-5 py-2.5 min-h-[44px] rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
            >
              {claiming ? "..." : "적용"}
            </button>
          </div>
        </div>
      </section>

      {/* Ticket status */}
      {data && (
        <section className="mb-8">
          <p className="text-[11px] text-brown-pale font-light mb-2">내 티켓 현황</p>
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(196,168,130,0.04)", border: "1.5px solid rgba(196,168,130,0.10)" }}
          >
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-brown-light font-light">가입 보너스</span>
              <span className="text-[13px] text-brown font-medium">1장</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-brown-light font-light">추천 보상</span>
              <span className="text-[13px] text-brown font-medium">{data.ticketsEarned}/{data.maxReferrals}장</span>
            </div>
            <div className="border-t border-brown-pale/15 mt-2 pt-2 flex justify-between items-center">
              <span className="text-[13px] text-brown font-medium">총 무료 티켓</span>
              <span className="text-[15px] text-coral font-bold">{1 + data.ticketsEarned}장</span>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <Link
        href="/"
        className="block w-full py-3.5 rounded-full text-center text-white text-[14px] font-medium no-underline transition-transform active:scale-[0.97]"
        style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)", boxShadow: "0 6px 20px rgba(224,122,95,0.3)" }}
      >
        동화 만들러 가기
      </Link>
    </div>
  );
}
