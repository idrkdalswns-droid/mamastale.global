"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { StoryCard } from "@/components/story/StoryCard";
import { trackCommunityView } from "@/lib/utils/analytics";
import type { Scene } from "@/lib/types/story";

const PAGE_SIZE = 4; // 한 페이지당 4개

interface CommunityStory {
  id: string;
  title: string;
  scenes: Scene[];
  author_alias: string | null;
  topic: string | null;
  cover_image: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
}

export default function CommunityBrowsePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // API는 12개/page 고정. 클라이언트에서 4개씩 슬라이스
  const [allStories, setAllStories] = useState<CommunityStory[]>([]);
  const totalPages = allStories.length > 0 ? Math.ceil(allStories.length / PAGE_SIZE) : 1;

  const fetchAllStories = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError("");
      // 충분한 데이터를 한 번에 로드 (API는 12개/page)
      const params = new URLSearchParams({ sort: "recent", page: "1" });
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/community?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllStories(data.stories || []);
      if (data.totalCount !== undefined) setTotalCount(data.totalCount);
    } catch {
      setError("동화 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 현재 페이지의 4개만 표시
  const startIdx = (page - 1) * PAGE_SIZE;
  const currentStories = allStories.slice(startIdx, startIdx + PAGE_SIZE);
  // stories를 currentStories로 사용
  const displayStories = currentStories;

  useEffect(() => {
    trackCommunityView("community_page");
  }, []);

  useEffect(() => {
    fetchAllStories(search);
    setPage(1);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages || loading) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 2열 분리
  const leftCol = displayStories.filter((_, i) => i % 2 === 0);
  const rightCol = displayStories.filter((_, i) => i % 2 === 1);

  const motionProps = {
    initial: { opacity: 0, y: 20, scale: 0.97 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: "-50px" as const },
    transition: { duration: 0.35, ease: "easeOut" as const },
  };

  return (
    <div className="min-h-dvh bg-cream relative overflow-hidden">
      {/* ═══════════ 히어로 (타이틀 + 검색) ═══════════ */}
      <div className="relative bg-cream">
        <WatercolorBlob top={-30} right={-40} size={180} color="rgba(200,184,216,0.10)" />
        <WatercolorBlob bottom={20} left={-30} size={150} color="rgba(184,216,208,0.08)" />

        <div className="relative z-10 flex flex-col items-center px-6 pt-16 pb-6">
          <p className="text-[10px] text-brown-pale/60 mb-1 tracking-widest">── ✦ ──</p>
          <h1 className="font-serif text-xl text-brown font-semibold text-center mb-1">
            엄마들의 마음이
            <br />
            동화가 되는 곳
          </h1>
          <p className="text-[11px] text-brown-light font-light mb-4">
            {totalCount !== null && totalCount > 0
              ? `${totalCount}개의 이야기`
              : "따뜻한 이야기를 만나보세요"}
          </p>

          {/* 검색바 */}
          <form onSubmit={handleSearch} className="w-full max-w-[320px]">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="동화 검색..."
                className="w-full pl-4 pr-10 py-2.5 rounded-full font-sans outline-none min-h-[44px] text-brown"
                style={{
                  background: "rgba(255,255,255,0.3)",
                  border: "1.5px solid rgba(196,149,106,0.15)",
                  fontSize: 14,
                }}
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="동화 검색"
                maxLength={100}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-brown-pale min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="검색어 지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 내 서재 링크 */}
        <Link
          href="/library"
          className="absolute top-4 right-4 z-20 text-[11px] text-brown-light font-medium no-underline min-h-[44px] flex items-center transition-all active:scale-[0.97]"
        >
          내 서재
        </Link>
      </div>

      {/* ═══════════ 스토리 카드 ═══════════ */}
      <div className="relative z-[1] max-w-2xl mx-auto px-4 pt-4">
        {loading && displayStories.length === 0 ? (
          /* 로딩: 2열 스켈레톤 */
          <div className="flex gap-3">
            {[0, 1].map(col => (
              <div key={col} className="flex-1 space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.5)" }}>
                    <div className="w-full animate-pulse" style={{ aspectRatio: "3/4", background: "linear-gradient(135deg, #FBF5EC, #F5EDE3)" }} />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-brown-pale/10 rounded w-3/4" />
                      <div className="h-2 bg-brown-pale/10 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-brown-light font-light mb-4">{error}</p>
            <button
              onClick={() => fetchAllStories(search)}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid min-h-[44px]"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : displayStories.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="font-serif text-lg text-brown font-semibold mb-2">
              {search ? "검색 결과가 없어요" : "아직 공유된 이야기가 없어요"}
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-5">
              {search ? "다른 키워드로 검색해 보세요" : "나만의 마음 동화를 만들고 공유해보세요"}
            </p>
            {!search && (
              <Link
                href="/?action=start"
                className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                }}
              >
                첫 번째 동화 만들기
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* 2열 Grid */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-3">
                {leftCol.map((story) => (
                  <motion.div key={story.id} {...motionProps}>
                    <StoryCard
                      id={story.id}
                      title={story.title}
                      scenes={story.scenes}
                      createdAt={story.created_at}
                      href={`/community/${story.id}`}
                      authorAlias={story.author_alias || "익명"}
                      topic={story.topic || undefined}
                      likeCount={story.like_count}
                      coverImage={story.cover_image || undefined}
                      aspectRatio="3/4"
                      compact
                    />
                  </motion.div>
                ))}
              </div>
              <div className="flex-1 space-y-3">
                {rightCol.map((story) => (
                  <motion.div key={story.id} {...motionProps}>
                    <StoryCard
                      id={story.id}
                      title={story.title}
                      scenes={story.scenes}
                      createdAt={story.created_at}
                      href={`/community/${story.id}`}
                      authorAlias={story.author_alias || "익명"}
                      topic={story.topic || undefined}
                      likeCount={story.like_count}
                      coverImage={story.cover_image || undefined}
                      aspectRatio="3/4"
                      compact
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ═══════════ 페이지네이션 (좌우 화살표) ═══════════ */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-6 mt-8 mb-4">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1 || loading}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-brown-pale disabled:opacity-30 transition-all active:scale-[0.95]"
                  aria-label="이전 페이지"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-[12px] text-brown-light font-light">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-brown-pale disabled:opacity-30 transition-all active:scale-[0.95]"
                  aria-label="다음 페이지"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════ 하단 CTA ═══════════ */}
        <div className="mt-8 mb-8 text-center">
          <Link
            href="/?action=start"
            className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
            }}
          >
            나도 동화 만들어보기
          </Link>
        </div>
      </div>
    </div>
  );
}
