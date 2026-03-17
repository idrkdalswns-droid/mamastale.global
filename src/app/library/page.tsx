"use client";

import { useState, useEffect, Component, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import StoryCarousel from "@/components/library/StoryCarousel";
import EmptyLibrary from "@/components/library/EmptyLibrary";
import { useChatStore } from "@/lib/hooks/useChat";
import { PHASES } from "@/lib/constants/phases";
import { createClient } from "@/lib/supabase/client";
import type { Scene } from "@/lib/types/story";

// R3-FIX: ErrorBoundary to catch rendering crashes gracefully
class LibraryErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("[Library] Render error:", error.name);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-cream flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm text-brown-light font-light mb-4">
              서재를 불러오는 중 문제가 발생했습니다.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid min-h-[44px]"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface StoryItem {
  id: string;
  title: string;
  scenes: Scene[];
  status: string;
  is_public?: boolean;
  is_unlocked?: boolean;
  cover_image?: string;
  topic?: string;
  created_at: string;
}

function LibraryContent() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { getDraftInfo, clearStorage } = useChatStore();
  const [draftInfo, setDraftInfo] = useState<{ phase: number; messageCount: number; savedAt: number } | null>(null);

  useEffect(() => {
    fetchStories();
    const info = getDraftInfo();
    if (info) setDraftInfo(info);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchStories and getDraftInfo are stable (never change), safe to omit
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

      const res = await fetch("/api/stories", { headers, credentials: "include" });
      if (!res.ok) {
        // R5-HIGH6: Show specific message for auth failures
        if (res.status === 401) throw new Error("AUTH");
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setStories(data.stories || []);
    } catch (err) {
      setError((err as Error).message === "AUTH"
        ? "로그인이 필요합니다. 로그인 후 다시 시도해주세요."
        : "동화 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream pb-20 relative overflow-hidden">
      <div className="relative z-[1] max-w-2xl mx-auto px-4 pt-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          className="text-center mb-4"
        >
          <h1 className="font-serif text-lg text-brown font-semibold">
            내 서재
          </h1>
          <p className="text-[11px] text-brown-light font-light mt-0.5">
            스와이프해서 동화를 골라보세요
          </p>
        </motion.div>

        {/* ── Draft in progress ── */}
        {draftInfo && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="rounded-2xl p-4 mb-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(var(--brown-pale), 0.08) 0%, rgba(var(--peach), 0.06) 100%)",
              border: "1.5px solid rgba(224,122,95,0.15)",
              boxShadow: "0 4px 12px rgba(var(--brown), 0.04)",
            }}
          >
            {/* Desk texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(var(--brown), 0.01) 1px, transparent 2px, transparent 40px)",
              }}
              aria-hidden="true"
            />

            <div className="flex items-center gap-3 mb-3 relative z-[1]">
              {/* Pencil icon (SVG) */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: PHASES[draftInfo.phase]?.accent || '#E07A5F' }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M14 2L18 6L8 16H4V12L14 2Z" fill="white" fillOpacity="0.9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-brown">진행 중인 대화</p>
                <p className="text-[11px] text-brown-pale font-light">
                  {draftInfo.phase}단계 · {draftInfo.messageCount}개의 메시지
                </p>
              </div>
            </div>
            <div className="flex gap-2 relative z-[1]">
              <Link
                href="/?action=start"
                className="flex-1 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-white text-center no-underline transition-all active:scale-[0.97] inline-flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
              >
                이어서 대화하기
              </Link>
              <button
                onClick={() => {
                  if (confirm("진행 중인 대화를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
                    clearStorage(); setDraftInfo(null);
                  }
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-light text-brown-pale transition-all"
                style={{ border: "1px solid rgba(196,149,106,0.2)" }}
                aria-label="저장된 대화 삭제"
              >
                삭제
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-6 h-6 mx-auto mb-3 border-2 border-brown-pale/30 border-t-brown-pale rounded-full animate-spin" />
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
          <EmptyLibrary />
        ) : (
          <StoryCarousel stories={stories} />
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <LibraryErrorBoundary>
      <LibraryContent />
    </LibraryErrorBoundary>
  );
}
