"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTickets } from "@/lib/hooks/useTickets";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import toast from "react-hot-toast";

interface ProfileData {
  email: string;
  createdAt: string;
  tickets: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [claimingRef, setClaimingRef] = useState(false);
  const { tickets: ticketCount, loading: ticketsLoading } = useTickets();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setProfile({
        email: user.email || "",
        createdAt: user.created_at || "",
        tickets: ticketCount,
      });
      setLoading(false);
    })();
  }, [router, ticketCount]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export", { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mamastale-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("데이터 내보내기에 실패했습니다.");
    }
    setExporting(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm.trim() !== "탈퇴합니다") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "탈퇴합니다" }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      alert("계정 삭제에 실패했습니다. 다시 시도해주세요.");
      setDeleting(false);
    }
  };

  const handleClaimRef = async () => {
    const code = refCode.trim().toUpperCase();
    if (!code || code.length < 4 || code.length > 8) {
      toast.error("추천 코드 4~8자리를 입력해 주세요.");
      return;
    }
    setClaimingRef(true);
    try {
      const supabase = createClient();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/referral", {
        method: "POST", headers, credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("추천 보상 지급! 양쪽 모두 티켓 1장 🎉");
        setRefCode("");
        setProfile(p => p ? { ...p, tickets: p.tickets + 1 } : p);
      } else if (res.status === 409) {
        toast.error("이미 추천을 받으셨습니다.");
      } else if (res.status === 404) {
        toast.error("존재하지 않는 추천 코드입니다.");
      } else if (res.status === 400) {
        toast.error(data.error || "유효하지 않은 코드입니다.");
      } else {
        toast.error("일시적 오류입니다. 다시 시도해 주세요.");
      }
    } catch {
      toast.error("네트워크 오류입니다. 인터넷 연결을 확인해 주세요.");
    }
    setClaimingRef(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <p className="text-sm text-brown-pale font-light">로딩 중...</p>
      </div>
    );
  }

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="min-h-dvh bg-cream relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />

      <div className="relative z-[1] max-w-[430px] mx-auto px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-brown-pale text-sm no-underline min-h-[44px] flex items-center">← 홈</Link>
          <h1 className="font-serif text-xl font-bold text-brown">설정</h1>
        </div>

        {/* Profile Section */}
        <section className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)" }}>
          <h2 className="text-sm font-medium text-brown mb-3">내 정보</h2>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-brown-light font-light">이메일</span>
              <span className="text-brown">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brown-light font-light">가입일</span>
              <span className="text-brown">{joinDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brown-light font-light">잔여 티켓</span>
              <span className="text-coral font-semibold">{profile?.tickets}장</span>
            </div>
          </div>
        </section>

        {/* Referral Section */}
        <section className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)" }}>
          <h2 className="text-sm font-medium text-brown mb-3">추천 프로그램</h2>
          <ReferralCard />

          {/* Manual referral code input */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(196,149,106,0.1)" }}>
            <p className="text-[12px] text-brown-light font-light mb-2">추천 코드를 받으셨나요?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="추천 코드 입력"
                maxLength={8}
                aria-label="추천 코드 입력"
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-light text-brown outline-none"
                style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.15)" }}
              />
              <button
                onClick={handleClaimRef}
                disabled={claimingRef || !refCode.trim()}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                {claimingRef ? "..." : "적용"}
              </button>
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)" }}>
          <h2 className="text-sm font-medium text-brown mb-3">데이터 관리</h2>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 rounded-xl text-sm font-light text-brown transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: "rgba(196,149,106,0.08)", border: "1px solid rgba(196,149,106,0.15)" }}
          >
            {exporting ? "내보내는 중..." : "내 데이터 내보내기 (JSON)"}
          </button>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl p-5" style={{ background: "rgba(224,122,95,0.04)", border: "1px solid rgba(224,122,95,0.1)" }}>
          <h2 className="text-sm font-medium text-coral mb-2">계정 삭제</h2>
          <p className="text-[11px] text-brown-light font-light mb-3 break-keep leading-relaxed">
            계정을 삭제하면 모든 동화, 대화 기록, 티켓이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="'탈퇴합니다' 입력"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-light text-brown outline-none mb-2"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(224,122,95,0.15)" }}
          />
          <button
            onClick={handleDelete}
            disabled={deleteConfirm.trim() !== "탈퇴합니다" || deleting}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-30"
            style={{ background: "#E07A5F" }}
          >
            {deleting ? "삭제 중..." : "계정 영구 삭제"}
          </button>
        </section>
      </div>
    </div>
  );
}
