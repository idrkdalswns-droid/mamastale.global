"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { BookshelfGrid } from "@/components/story/Bookshelf";
import { useChatStore } from "@/lib/hooks/useChat";
import { PHASES } from "@/lib/constants/phases";
import { createClient } from "@/lib/supabase/client";
import type { Scene } from "@/lib/types/story";

interface StoryItem {
  id: string;
  title: string;
  scenes: Scene[];
  status: string;
  is_public?: boolean;
  created_at: string;
}

export default function LibraryPage() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { getDraftInfo, clearStorage } = useChatStore();
  const [draftInfo, setDraftInfo] = useState<{ phase: number; messageCount: number; savedAt: number } | null>(null);

  useEffect(() => {
    fetchStories();
    const info = getDraftInfo();
    if (info) setDraftInfo(info);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStories = async () => {
    try {
      // Include auth token in headers (belt-and-suspenders for cookie issues)
      const headers: Record<string, string> = {};
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        }
      } catch { /* ignore */ }

      const res = await fetch("/api/stories", { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStories(data.stories || []);
    } catch {
      setError("동화 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream px-6 pt-8 pb-20 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={100} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-lg text-brown font-semibold">
            내 서재
          </h1>
          <p className="text-xs text-brown-light font-light mt-1">
            나만의 동화 컬렉션
          </p>
        </div>

        {/* Draft in progress */}
        {draftInfo && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: "rgba(224,122,95,0.06)", border: "1.5px solid rgba(224,122,95,0.15)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: PHASES[draftInfo.phase]?.accent || '#E07A5F' }}>{draftInfo.phase}</span>
              <div>
                <p className="text-sm font-semibold text-brown">진행 중인 대화</p>
                <p className="text-[11px] text-brown-pale font-light">
                  {draftInfo.phase}단계 · {draftInfo.messageCount}개의 메시지
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/?action=start"
                className="flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-white text-center no-underline transition-all active:scale-[0.97] inline-flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                이어서 대화하기
              </Link>
              <button
                onClick={() => { clearStorage(); setDraftInfo(null); }}
                className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-light text-brown-pale transition-all"
                style={{ border: "1px solid rgba(196,149,106,0.2)" }}
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-sm text-brown-light font-light">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-brown-light font-light mb-4">{error}</p>
            <button
              onClick={() => { setError(""); setLoading(true); fetchStories(); }}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid min-h-[44px]"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div>
            <BookshelfGrid stories={[]} />
            <div className="text-center mt-6">
              <p className="text-sm text-brown-light font-light mb-4">
                아직 완성된 동화가 없어요
              </p>
              <Link
                href="/?action=start"
                className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                }}
              >
                첫 동화 만들러 가기 →
              </Link>
            </div>
          </div>
        ) : (
          <BookshelfGrid stories={stories} />
        )}
      </div>
    </div>
  );
}
