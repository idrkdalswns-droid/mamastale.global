"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { StoryCard } from "@/components/story/StoryCard";
import type { Scene } from "@/lib/types/story";

const TOPICS = [
  { key: "", label: "전체" },
  { key: "산후우울", label: "산후우울" },
  { key: "양육번아웃", label: "양육번아웃" },
  { key: "시댁갈등", label: "시댁갈등" },
  { key: "경력단절", label: "경력단절" },
  { key: "자존감", label: "자존감" },
];

interface CommunityStory {
  id: string;
  title: string;
  scenes: Scene[];
  author_alias: string | null;
  topic: string | null;
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchStories = async (sortBy: string, topicFilter: string, pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ sort: sortBy, page: String(pageNum) });
      if (topicFilter) params.set("topic", topicFilter);
      const res = await fetch(`/api/community?${params}`);
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
    fetchStories(sort, topic, 1);
    setPage(1);
  }, [sort, topic]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStories(sort, topic, nextPage, true);
  };

  return (
    <div className="min-h-dvh bg-cream px-6 pt-8 pb-20 relative overflow-hidden">
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
              커뮤니티
            </h2>
            <p className="text-xs text-brown-light font-light mt-1">
              다른 엄마들의 마음 동화를 읽어보세요
            </p>
          </div>
          <Link href="/" className="text-xs text-brown-mid font-light no-underline min-h-[44px] min-w-[44px] flex items-center justify-center">
            ← 홈
          </Link>
        </div>

        {/* Topic filter */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {TOPICS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              aria-pressed={topic === t.key}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
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
            aria-pressed={sort === "popular"}
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
            <div className="text-sm text-brown-light mb-3 animate-pulse">...</div>
            <p className="text-sm text-brown-light font-light">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-brown-light font-light mb-4">{error}</p>
            <button
              onClick={() => fetchStories(sort, topic, 1)}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="font-serif text-lg text-brown font-semibold mb-2">
              {topic ? "해당 주제의 동화가 없어요" : "아직 공유된 동화가 없어요"}
            </h3>
            <p className="text-sm text-brown-light font-light leading-relaxed">
              {topic ? "다른 주제를 선택해 보세요" : "첫 번째로 동화를 공유해 보세요!"}
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
                  topic={story.topic || undefined}
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
