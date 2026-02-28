"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { StoryCard } from "@/components/story/StoryCard";
import type { Scene } from "@/lib/types/story";

interface CommunityStory {
  id: string;
  title: string;
  scenes: Scene[];
  author_alias: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
}

export default function CommunityBrowsePage() {
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchStories = async (sortBy: string, pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/community?sort=${sortBy}&page=${pageNum}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStories(prev => append ? [...prev, ...data.stories] : data.stories);
      setHasMore(data.hasMore);
    } catch {
      if (!append) setError("동화 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories(sort, 1);
    setPage(1);
  }, [sort]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStories(sort, nextPage, true);
  };

  return (
    <div className="min-h-dvh bg-cream px-6 py-8 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(200,184,216,0.07)" />
      <WatercolorBlob bottom={100} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1] max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="font-serif text-xl font-bold text-brown no-underline">
              mamastale
            </Link>
            <h2 className="font-serif text-lg text-brown font-semibold mt-2">
              🌍 커뮤니티
            </h2>
            <p className="text-xs text-brown-light font-light mt-1">
              다른 엄마들의 치유 동화를 읽어보세요
            </p>
          </div>
          <Link href="/" className="text-xs text-brown-mid font-light no-underline">
            ← 홈
          </Link>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSort("recent")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              sort === "recent"
                ? "bg-coral text-white"
                : "bg-white/50 text-brown-light border border-brown-pale/15"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSort("popular")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
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
            <div className="text-3xl mb-3 animate-pulse">🌍</div>
            <p className="text-sm text-brown-light font-light">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-3xl mb-3">😕</div>
            <p className="text-sm text-brown-light font-light mb-4">{error}</p>
            <button
              onClick={() => fetchStories(sort, 1)}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="font-serif text-lg text-brown font-semibold mb-2">
              아직 공유된 동화가 없어요
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed">
              첫 번째로 동화를 공유해 보세요!
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  id={story.id}
                  title={story.title}
                  scenes={story.scenes}
                  createdAt={story.created_at}
                  href={`/community/${story.id}`}
                  authorAlias={story.author_alias || "익명의 엄마"}
                  viewCount={story.view_count}
                  likeCount={story.like_count}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full mt-4 py-3 rounded-full text-sm font-light text-brown-mid border border-brown-pale/20 active:scale-[0.98] transition-all"
              >
                {loading ? "불러오는 중..." : "더 보기"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
