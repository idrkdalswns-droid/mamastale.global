"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryViewer } from "@/components/story/StoryViewer";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Scene } from "@/lib/types/story";

interface StoryData {
  id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
}

export default function LibraryStoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/stories/${params.id}`)
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
          <p className="text-sm text-brown-light font-light mb-4">{error || "동화를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push("/library")}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid"
            style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
          >
            내 서재로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <StoryViewer
      scenes={story.scenes}
      title={story.title || "나의 치유 동화"}
      authorName={user?.user_metadata?.name || undefined}
      onBack={() => router.push("/library")}
    />
  );
}
