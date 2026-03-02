"use client";

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

/** Author testimonials — matched by author_alias from sample stories */
const AUTHOR_TESTIMONIALS: Record<string, string> = {
  "준우맘":
    "이 동화를 만들면서 그동안 혼자 삼키던 감정을 처음으로 꺼내볼 수 있었어요. 완성된 동화를 준우에게 읽어줬더니 \"엄마 이야기야?\"라며 꼭 안아주더라고요. 아이가 제 마음을 알아준 것 같아서 정말 많이 울었습니다.",
  "서연이네":
    "두 아이 재우고 새벽에 혼자 대화를 나눴는데, 마치 오랜 친구와 이야기하는 것 같았어요. 동화 속 지친 별이 쉼터를 찾는 이야기가 바로 저의 이야기더라고요. 서연이가 매일 밤 이 동화를 읽어달라고 합니다.",
  "하준맘":
    "시댁 문제는 누구에게도 말하기 어려운 이야기였는데, 동화라는 형태로 풀어내니까 마음이 한결 편해졌어요. 하준이에게 이 동화를 읽어주며 서로 다른 것도 아름다울 수 있다고 이야기해줬습니다.",
  "지우맘":
    "경력단절 후 '나는 뭘 하는 사람이지' 매일 고민했는데, 동화를 만들면서 제 경험이 결코 헛되지 않았다는 걸 깨달았어요. 지우가 동화 속 나비를 보며 \"엄마처럼 예뻐!\"라고 했을 때 눈물이 나더라고요.",
  "시우맘":
    "첫 아이를 낳고 자존감이 바닥이었는데, 동화 속 거울 이야기가 제 마음을 그대로 비춰줬어요. 시우가 크면 이 동화를 함께 읽으며 엄마가 얼마나 너를 사랑했는지 전해주고 싶어요.",
};

export default function CommunityStoryClient() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<CommunityStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    const controller = new AbortController();
    fetch(`/api/community/${params.id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setStory(data.story))
      .catch((err) => {
        if (err?.name !== "AbortError") setError("동화를 찾을 수 없습니다.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-brown-light font-light animate-pulse">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center">
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

  const testimonial = story.author_alias ? AUTHOR_TESTIMONIALS[story.author_alias] : null;

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Story info bar */}
      <div className="bg-white/80 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between text-xs text-brown-light border-b border-black/[0.04]">
        <span>{story.author_alias || "익명의 엄마"}</span>
        <div className="flex gap-3">
          <span>조회 {story.view_count}</span>
        </div>
      </div>

      {/* Story */}
      <div className="flex-1">
        <StoryViewer
          scenes={story.scenes}
          title={story.title || "마음 동화"}
          authorName={story.author_alias || "익명의 엄마"}
          onBack={() => router.push("/community")}
          embedded
        />
      </div>

      {/* Author testimonial */}
      {testimonial && (
        <div className="bg-cream px-5 py-5 border-t border-black/[0.04]">
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(196,149,106,0.1)" }}
          >
            <p className="text-xs font-medium text-brown mb-2">
              {story.author_alias}님의 한마디
            </p>
            <p className="text-[13px] text-brown-light leading-7 font-light break-keep">
              &ldquo;{testimonial}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Social actions bar */}
      <div className="bg-cream border-t border-black/[0.04] px-4 py-3">
        <div className="flex items-center justify-between">
          <LikeButton storyId={story.id} initialCount={story.like_count || 0} />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const url = `${window.location.origin}/community/${story.id}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: story.title || "마음 동화", url });
                  } catch { /* user cancelled */ }
                } else {
                  await navigator.clipboard.writeText(url);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: shareCopied ? "rgba(127,191,176,0.12)" : "rgba(255,255,255,0.6)",
                border: shareCopied ? "1.5px solid rgba(127,191,176,0.3)" : "1.5px solid rgba(196,149,106,0.15)",
                color: shareCopied ? "#5A9E8F" : "#8B6F55",
              }}
            >
              {shareCopied ? "✓ 복사됨" : "공유"}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              aria-expanded={showComments}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "1.5px solid rgba(196,149,106,0.15)",
                color: "#8B6F55",
              }}
            >
              댓글 <span>{story.comment_count ?? 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="bg-cream border-t border-black/[0.04]">
          <CommentSection
            storyId={story.id}
            onCommentAdded={() =>
              setStory((prev) =>
                prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : null
              )
            }
          />
        </div>
      )}
    </div>
  );
}
