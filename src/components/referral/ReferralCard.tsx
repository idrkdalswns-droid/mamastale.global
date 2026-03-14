"use client";

import { useState, useEffect, useCallback } from "react";
import { hapticLight, hapticSuccess } from "@/lib/utils/haptic";
import { trackScreenView } from "@/lib/utils/analytics";

interface ReferralData {
  code: string;
  referralCount: number;
  ticketsEarned: number;
  shareUrl: string;
}

interface ReferralCardProps {
  getHeaders?: () => Record<string, string>;
}

export function ReferralCard({ getHeaders }: ReferralCardProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/referral", {
          headers: getHeaders?.() || {},
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          setError("추천 코드를 불러올 수 없습니다.");
        }
      } catch {
        setError("네트워크 오류");
      } finally {
        setLoading(false);
      }
    })();
    trackScreenView("referral_card");
  }, [getHeaders]);

  const handleCopy = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = data.shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    hapticSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    hapticLight();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "mamastale — 엄마의 삶이 아이의 동화가 되다",
          text: `친구의 추천으로 가입하면 동화 만들기 1회를 무료로 받을 수 있어요!`,
          url: data.shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  }, [data, handleCopy]);

  if (loading) {
    return (
      <div className="rounded-2xl p-5 bg-paper animate-pulse">
        <div className="h-4 bg-brown-pale/20 rounded w-1/3 mb-3" />
        <div className="h-8 bg-brown-pale/20 rounded w-2/3" />
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently hide if error
  }

  return (
    <div className="rounded-2xl p-5 bg-paper border border-brown-pale/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎁</span>
        <h3 className="text-sm font-semibold text-brown">친구 초대하고 무료 1회 받기</h3>
      </div>

      <p className="text-xs text-brown-light mb-4 leading-5 break-keep">
        아래 링크로 친구를 초대하면, 친구도 나도 동화 만들기 1회를 무료로 받아요!
      </p>

      {/* Referral code display */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-cream rounded-xl px-4 py-3 text-center">
          <span className="text-xs text-brown-pale block mb-0.5">내 추천 코드</span>
          <span className="text-lg font-bold text-brown tracking-widest font-mono">
            {data.code}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97]"
          style={{
            background: copied
              ? "linear-gradient(135deg, #7FBFB0, #5FA89A)"
              : "linear-gradient(135deg, #E07A5F, #C96B52)",
            color: "#FFF",
            boxShadow: "0 4px 12px rgba(224,122,95,0.25)",
          }}
        >
          {copied ? "복사됨!" : "링크 복사"}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97] bg-white border border-brown-pale/20 text-brown"
        >
          공유하기
        </button>
      </div>

      {/* Stats */}
      {data.referralCount > 0 && (
        <div className="mt-3 pt-3 border-t border-brown-pale/10 flex justify-between">
          <span className="text-xs text-brown-pale">초대한 친구</span>
          <span className="text-xs font-medium text-brown">{data.referralCount}명 (+{data.ticketsEarned}회)</span>
        </div>
      )}
    </div>
  );
}
