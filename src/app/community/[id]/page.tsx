"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryViewer } from "@/components/story/StoryViewer";
import { LikeButton } from "@/components/community/LikeButton";
import { CommentSection } from "@/components/community/CommentSection";
import type { Scene } from "@/lib/types/story";

interface CommunityStoryData {
  id: string;
  title: string;
  scenes: Scene[];
  author_alias: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export default function CommunityStoryPage() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<CommunityStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/community/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setStory(data.story))
      .catch(() => setError("동화를 찾을 수 없습니다."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">📖</div>
          <p className="text-sm text-brown-light font-light">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center">
          <div className="text-3xl mb-3">😕</div>
          <p className="text-sm text-brown-light font-light mb-4">{error}</p>
          <button
            onClick={() => router.push("/community")}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid"
            style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
          >
            커뮤니티로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Story info bar */}
      <div className="bg-white/80 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between text-xs text-brown-light border-b border-black/[0.04]">
        <span>{story.author_alias || "익명의 엄마"}</span>
        <div className="flex gap-3">
          <span>👁 {story.view_count}</span>
        </div>
      </div>

      {/* Story */}
      <div className="flex-1">
        <StoryViewer
          scenes={story.scenes}
          title={story.title || "치유 동화"}
          authorName={story.author_alias || "익명의 엄마"}
          onBack={() => router.push("/community")}
        />
      </div>

      {/* Social actions bar */}
      <div
        className="bg-cream border-t border-black/[0.04] px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <LikeButton storyId={story.id} initialCount={story.like_count || 0} />
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1.5px solid rgba(196,149,106,0.15)",
              color: "#8B6F55",
            }}
          >
            💬 <span>{story.comment_count || 0}</span>
          </button>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="bg-cream border-t border-black/[0.04]">
          <CommentSection storyId={story.id} />
        </div>
      )}
    </div>
  );
}
