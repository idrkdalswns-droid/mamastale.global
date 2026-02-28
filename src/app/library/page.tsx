"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { StoryCard } from "@/components/story/StoryCard";
import type { Scene } from "@/lib/types/story";

interface StoryItem {
  id: string;
  title: string;
  scenes: Scene[];
  status: string;
  created_at: string;
}

export default function LibraryPage() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch("/api/stories");
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
    <div className="min-h-dvh bg-cream px-6 py-8 relative overflow-hidden">
      <WatercolorBlob top={-60} right={-80} size={220} color="rgba(232,168,124,0.06)" />
      <WatercolorBlob bottom={100} left={-60} size={200} color="rgba(184,216,208,0.07)" />

      <div className="relative z-[1]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="font-serif text-xl font-bold text-brown no-underline">
              mamastale
            </Link>
            <h2 className="font-serif text-lg text-brown font-semibold mt-2">
              📚 내 서재
            </h2>
            <p className="text-xs text-brown-light font-light mt-1">
              완성한 동화들을 다시 읽어보세요
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-brown-mid font-light no-underline"
          >
            ← 홈
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-3xl mb-3 animate-pulse">📖</div>
            <p className="text-sm text-brown-light font-light">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-3xl mb-3">😕</div>
            <p className="text-sm text-brown-light font-light mb-4">{error}</p>
            <button
              onClick={() => { setError(""); setLoading(true); fetchStories(); }}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid"
              style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
            >
              다시 시도
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="font-serif text-lg text-brown font-semibold mb-2">
              아직 완성한 동화가 없어요
            </h3>
            <p className="text-sm text-brown-light font-light mb-6 leading-relaxed">
              AI 상담사와 대화하며<br />
              나만의 치유 동화를 만들어 보세요
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-full text-sm font-medium text-white no-underline"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #D4836B)",
                boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
              }}
            >
              첫 동화 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                id={story.id}
                title={story.title}
                scenes={story.scenes}
                createdAt={story.created_at}
                href={`/library/${story.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
