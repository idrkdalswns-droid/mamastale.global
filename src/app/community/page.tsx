"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { StoryCard } from "@/components/story/StoryCard";
import { trackCommunityView } from "@/lib/utils/analytics";
import type { Scene } from "@/lib/types/story";

// Sprint 2-A: Child-centric keyword overhaul
const TOPICS = [
  { key: "", label: "전체" },
  { key: "자존감", label: "자존감" },
  { key: "성장", label: "성장" },
  { key: "감정표현", label: "감정표현" },
  { key: "분노조절", label: "분노조절" },
  { key: "우울극복", label: "우울극복" },
  { key: "용기", label: "용기" },
  { key: "친구관계", label: "친구관계" },
  { key: "가족사랑", label: "가족사랑" },
];

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
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [topic, setTopic] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const fetchStories = async (sortBy: string, topicFilter: string, pageNum: number, append = false, searchQuery = "") => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ sort: sortBy, page: String(pageNum) });
      if (topicFilter) params.set("topic", topicFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/community?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStories(prev => append ? [...prev, ...data.stories] : data.stories);
      setHasMore(data.hasMore);
      if (data.totalCount !== undefined) setTotalCount(data.totalCount);
    } catch {
      if (!append) setError("동화 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    trackCommunityView("community_page");
  }, []);

  useEffect(() => {
    fetchStories(sort, topic, 1, false, search);
    setPage(1);
  }, [sort, topic, search]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStories(sort, topic, nextPage, true, search);
  }, [loading, hasMore, page, sort, topic, search]);

  // Sprint 7-A: IntersectionObserver for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="min-h-dvh bg-cream px-6 pt-8 pb-20 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(200,184,216,0.07)" />
      <WatercolorBlob bottom={100} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-lg text-brown font-semibold">
              커뮤니티
            </h1>
            <Link
              href="/library"
              className="text-[11px] text-brown-light font-medium no-underline px-3 py-1.5 rounded-full min-h-[44px] flex items-center transition-all active:scale-[0.97]"
              style={{ border: "1.5px solid rgba(196,149,106,0.2)", background: "rgba(255,255,255,0.5)" }}
            >
              📚 내 서재
            </Link>
          </div>
          <p className="text-xs text-brown-light font-light mt-1">
            {totalCount !== null && totalCount > 0
              ? `${totalCount}개의 이야기가 공유되었어요`
              : "다른 분들의 마음 동화를 읽어보세요"}
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="동화 제목이나 내용 검색..."
              className="w-full pl-4 pr-4 py-2.5 rounded-xl font-sans outline-none min-h-[44px]"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "1.5px solid rgba(196,149,106,0.15)",
                fontSize: 16,
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
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-brown-pale min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Topic filter */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              aria-pressed={topic === t.key}
              className={`shrink-0 px-3 py-2 rounded-full text-[11px] font-medium transition-all min-h-[44px] ${
                topic === t.key
                  ? "bg-brown text-white"
                  : "bg-white/50 text-brown-light border border-brown-pale/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSort("recent")}
            aria-pressed={sort === "recent"}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all min-h-[44px] flex items-center ${
              sort === "recent"
                ? "bg-coral text-white"
                : "bg-white/50 text-brown-light border border-brown-pale/15"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSort("popular")}
            aria-pressed={sort === "popular"}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all min-h-[44px] flex items-center ${
              sort === "popular"
                ? "bg-coral text-white"
                : "bg-white/50 text-brown-light border border-brown-pale/15"
            }`}
          >
            인기순
          </button>
        </div>

        {/* Stories */}
        {loading && stories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-sm text-brown-light mb-3 animate-pulse">...</div>
            <p className="text-sm text-brown-light font-light">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-brown-light font-light mb-4">{error}</p>
            <button
              onClick={() => fetchStories(sort, topic, 1, false, search)}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid min-h-[44px]"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="font-serif text-lg text-brown font-semibold mb-2">
              {topic ? "해당 주제의 동화가 없어요" : "아직 공유된 이야기가 없어요"}
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed mb-5">
              {topic ? "다른 주제를 선택해 보세요" : "나만의 마음 동화를 만들고 공유해보세요"}
            </p>
            {!topic && (
              <Link
                href="/?action=start"
                className="inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 rounded-full text-white text-sm font-medium no-underline transition-transform active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                }}
              >
                나만의 동화 만들기 →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  id={story.id}
                  title={story.title}
                  scenes={story.scenes}
                  createdAt={story.created_at}
                  href={`/community/${story.id}`}
                  authorAlias={story.author_alias || "익명"}
                  topic={story.topic || undefined}
                  viewCount={story.view_count}
                  likeCount={story.like_count}
                  coverImage={story.cover_image || undefined}
                />
              ))}
            </div>

            {/* Sprint 7-A: Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="w-full mt-4 py-3 text-center">
                {loading && <span className="text-sm text-brown-light font-light animate-pulse">불러오는 중...</span>}
              </div>
            )}
          </>
        )}

        {/* CTA — encourage users to create their own story */}
        <div className="mt-8 text-center">
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
