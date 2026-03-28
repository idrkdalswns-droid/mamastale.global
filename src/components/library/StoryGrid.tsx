"use client";

import { memo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resolveCover } from "@/lib/utils/default-cover";
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
  expires_at?: string | null;
  is_locked?: boolean;
  is_blinded?: boolean;
  story_type?: string;
}

interface StoryGridProps {
  stories: StoryItem[];
}

// ─── Grid Card ───
const GridCard = memo(function GridCard({
  story,
}: {
  story: StoryItem;
}) {
  const router = useRouter();
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const cover = resolveCover(story.cover_image, story.id, story.topic);

  // Bug Bounty Fix 2-1: Safety timeout — force show image after 3s if onLoad never fires.
  useEffect(() => {
    if (imgLoaded) return;
    const timer = setTimeout(() => setImgLoaded(true), 3000);
    return () => clearTimeout(timer);
  }, [imgLoaded]);
  const fallback = resolveCover(undefined, story.id, story.topic);
  const sceneCount = story.scenes?.length || 0;

  // Date formatting: "3월 15일"
  const date = new Date(story.created_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });

  const topicLabel = story.topic ? TOPIC_LABELS[story.topic] : null;

  const handleClick = (e: React.MouseEvent) => {
    if (story.is_locked || story.is_blinded) {
      e.preventDefault();
      router.push("/pricing");
    }
  };

  return (
    <Link
      href={story.is_locked || story.is_blinded ? "/pricing" : `/library/${story.id}`}
      role="listitem"
      aria-label={`동화: ${story.title || "나의 마음 동화"}, ${date}, ${sceneCount}장면`}
      className="block overflow-hidden rounded-xl transition-transform duration-150 active:scale-[0.97] no-underline"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(196,149,106,0.12)",
        boxShadow: "0 2px 12px rgba(90,62,43,0.06)",
      }}
      onClick={handleClick}
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
          onError={() => { setImgErr(true); setImgLoaded(true); }}
        />

        {/* Lock badge */}
        {story.is_unlocked === false && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-medium text-white bg-brown/60 backdrop-blur-sm">
            미리보기
          </div>
        )}

        {/* Lock overlay for expired DIY stories */}
        {story.is_locked && (
          <div className="absolute inset-0 bg-cream/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 rounded-xl">
            <span className="text-2xl">💛</span>
            <span className="text-[10px] text-brown font-medium text-center px-2">소중한 동화가<br/>기다리고 있어요</span>
          </div>
        )}

        {/* Blind overlay for free-trial-expired stories */}
        {story.is_blinded && !story.is_locked && (
          <div className="absolute inset-0 bg-cream/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 rounded-xl">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--brown-pale))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <path d="M1 1l22 22" />
            </svg>
            <span className="text-[10px] text-brown-pale font-medium text-center px-2">무료 열람 기간 만료</span>
          </div>
        )}

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
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
          {story.is_public && (
            <>
              <span className="text-[10px] text-brown-pale">·</span>
              <span className="text-[9px] text-coral font-medium">공유중</span>
            </>
          )}
          {story.expires_at && !story.is_locked && (() => {
            const days = Math.max(0, Math.ceil((new Date(story.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return <span className="text-[9px] text-brown-pale font-medium">{days}일 남음</span>;
          })()}
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
