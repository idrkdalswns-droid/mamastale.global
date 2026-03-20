"use client";

import { useState, useEffect, Component, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import StoryGrid from "@/components/library/StoryGrid";
import EmptyLibrary from "@/components/library/EmptyLibrary";
import TicketPrompt from "@/components/library/TicketPrompt";
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
  const router = useRouter();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const { getDraftInfo, clearStorage } = useChatStore();
  const [draftInfo, setDraftInfo] = useState<{ phase: number; messageCount: number; savedAt: number } | null>(null);

  useEffect(() => {
    fetchData();
    const info = getDraftInfo();
    if (info) setDraftInfo(info);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData and getDraftInfo are stable (never change), safe to omit
  }, []);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
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
    return headers;
  };

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();

      // Promise.allSettled: stories 실패 → 에러, tickets 실패 → graceful degradation
      const [storiesResult, ticketsResult] = await Promise.allSettled([
        fetch("/api/stories", { headers, credentials: "include" }),
        fetch("/api/tickets", { headers, credentials: "include" }),
      ]);

      // Handle stories
      if (storiesResult.status === "fulfilled") {
        const res = storiesResult.value;
        if (!res.ok) {
          if (res.status === 401) { router.push("/login?redirect=/library"); return; }
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setStories(data.stories || []);
      } else {
        throw new Error("Failed to fetch");
      }

      // Handle tickets (graceful degradation)
      if (ticketsResult.status === "fulfilled" && ticketsResult.value.ok) {
        const ticketData = await ticketsResult.value.json();
        setTicketsRemaining(ticketData.remaining ?? null);
      }
      // tickets 실패 시 → null 유지 (TicketPrompt 숨김)

    } catch (err) {
      if ((err as Error).message === "AUTH") {
        router.push("/login?redirect=/library");
        return;
      }
      setError("동화 목록을 불러올 수 없습니다.");
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
            {stories.length > 0
              ? `${stories.length}편의 동화${ticketsRemaining !== null && ticketsRemaining > 0 ? ` · 이용권 ${ticketsRemaining}편 남음` : ""}`
              : "아직 동화가 없어요"}
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
            {/* WiFi-off icon */}
            <svg className="w-10 h-10 mx-auto mb-3 text-brown-pale/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
            <p className="text-sm text-brown-light font-light mb-1">
              {error.includes("fetch") || error.includes("network") || error.includes("Failed")
                ? "인터넷 연결을 확인해 주세요"
                : "서버에 문제가 발생했어요"}
            </p>
            <p className="text-[11px] text-brown-pale font-light mb-4">잠시 후 다시 시도해 주세요</p>
            <button
              onClick={() => { setError(""); setLoading(true); fetchData(); }}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid min-h-[44px]"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : stories.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <>
            {ticketsRemaining !== null && <TicketPrompt remaining={ticketsRemaining} />}
            <StoryGrid stories={stories} />
          </>
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
