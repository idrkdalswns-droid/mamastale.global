"use client";

import { memo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { resolveCover } from "@/lib/utils/default-cover";
import { trackStoryShare } from "@/lib/utils/analytics";
import type { Scene } from "@/lib/types/story";

// ─── Topic Labels ───
const TOPIC_LABELS: Record<string, string> = {
  양육: "양육",
  치유: "치유",
  성장: "성장",
  관계: "관계",
  정체성: "정체성",
  기타: "기타",
};

// 크림색 SVG placeholder
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVlZWUwIi8+PC9zdmc+";

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
  source?: string;
}

interface StoryGridProps {
  stories: StoryItem[];
}

// ─── Grid Card ───
const GridCard = memo(function GridCard({ story }: { story: StoryItem }) {
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const cover = resolveCover(story.cover_image, story.id, story.topic);
  const fallback = resolveCover(undefined, story.id, story.topic);
  const sceneCount = story.scenes?.length || 0;

  // Date formatting: "3월 15일"
  const date = new Date(story.created_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  const topicLabel = story.topic ? TOPIC_LABELS[story.topic] : null;

  return (
    <Link
      href={`/library/${story.id}`}
      role="listitem"
      aria-label={`동화: ${story.title || "나의 마음 동화"}, ${date}, ${sceneCount}장면`}
      className="block overflow-hidden rounded-xl transition-transform duration-150 active:scale-[0.97] no-underline"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(196,149,106,0.12)",
        boxShadow: "0 2px 12px rgba(90,62,43,0.06)",
      }}
    >
      {/* Cover Image */}
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-paper via-cream to-paper animate-pulse" />
        )}
        <Image
          src={imgErr ? fallback : cover}
          alt={`${story.title || "동화"} 표지`}
          fill
          className={`object-cover object-center transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          sizes="(max-width: 430px) 50vw, 215px"
          loading="lazy"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgErr(true)}
        />

        {/* Lock badge */}
        {story.is_unlocked === false && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-medium text-white bg-brown/60 backdrop-blur-sm">
            미리보기
          </div>
        )}

        {/* Public badge + Share button */}
        {story.is_public && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = `${window.location.origin}/community/${story.id}`;
                if (navigator.share) {
                  navigator.share({ title: story.title || "나의 마음 동화", url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url).then(() => toast("링크가 복사되었어요", { icon: "📋" }));
                }
                trackStoryShare(story.id, "grid_share");
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm transition-all active:scale-90"
              aria-label="동화 공유"
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="rgb(90,62,43)" strokeWidth="1.5">
                <path d="M15 7a3 3 0 100-6 3 3 0 000 6zM5 13a3 3 0 100-6 3 3 0 000 6zM15 19a3 3 0 100-6 3 3 0 000 6zM7.59 11.51l4.83 2.98M12.41 5.51L7.59 8.49" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium text-white bg-coral/70 backdrop-blur-sm">
              공유됨
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-10"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.12) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Metadata */}
      <div className="p-2.5">
        <h3 className="font-serif text-[13px] font-semibold text-brown leading-tight line-clamp-1 mb-1">
          {story.title || "나의 마음 동화"}
        </h3>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-brown-pale">{date}</span>
          <span className="text-[10px] text-brown-pale">·</span>
          <span className="text-[10px] text-brown-pale">{sceneCount}장면</span>
          {topicLabel && (
            <>
              <span className="text-[10px] text-brown-pale">·</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(224,122,95,0.1)",
                  color: "rgb(var(--coral))",
                }}
              >
                {topicLabel}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
});

// ─── Story Grid ───
export default function StoryGrid({ stories }: StoryGridProps) {
  return (
    <div className="w-full px-4 pb-4">
      <div
        role="list"
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
      >
        {stories.map((story) => (
          <GridCard key={story.id} story={story} />
        ))}
      </div>

      {/* 새 동화 만들기 */}
      <div className="text-center mt-5 mb-8">
        <Link
          href="/?action=start"
          className="text-[12px] text-brown-pale underline underline-offset-2 decoration-brown-pale/30"
        >
          + 새 동화 만들기
        </Link>
      </div>
    </div>
  );
}
