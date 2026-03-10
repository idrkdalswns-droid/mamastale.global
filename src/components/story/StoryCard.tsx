"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveCover } from "@/lib/utils/default-cover";
import type { Scene } from "@/lib/types/story";

interface StoryCardProps {
  id: string;
  title: string;
  scenes: Scene[];
  createdAt: string;
  href: string;
  authorAlias?: string;
  topic?: string;
  viewCount?: number;
  likeCount?: number;
  coverImage?: string;
}

// FI-2: Memoize to prevent unnecessary re-renders in list contexts
export const StoryCard = memo(function StoryCard({
  id,
  title,
  scenes,
  createdAt,
  href,
  authorAlias,
  topic,
  viewCount,
  likeCount,
  coverImage,
}: StoryCardProps) {
  const resolvedCover = resolveCover(coverImage, id, topic);
  const firstScene = scenes?.[0];
  const fullText = firstScene?.text || "";
  const previewText = fullText.slice(0, 80);
  const isTruncated = fullText.length > 80;
  const sceneCount = scenes?.length || 0;
  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={href}
      className="block rounded-2xl overflow-hidden transition-all active:scale-[0.98] no-underline"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(196,149,106,0.1)",
      }}
    >
      {/* Cover Image */}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        <Image
          src={resolvedCover}
          alt={`${title || "동화"} 표지`}
          fill
          className="object-cover object-center"
          sizes="(max-width: 430px) 100vw, 430px"
          loading="lazy"
        />

        {/* Topic badge overlay */}
        {topic && (
          <span
            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-medium"
            style={{
              background: "rgba(255,255,255,0.85)",
              color: "#8B7355",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            {topic}
          </span>
        )}

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Text content */}
      <div className="p-3.5">
        <h3 className="font-serif text-sm font-semibold text-brown mb-1 leading-tight line-clamp-1">
          {title || "나의 마음 동화"}
        </h3>

        {previewText && (
          <p className="text-xs text-brown-light font-light leading-relaxed line-clamp-1 mb-2">
            {previewText}
            {isTruncated && "..."}
          </p>
        )}

        <div className="flex items-center gap-2 text-[10px] text-brown-pale">
          {authorAlias && (
            <>
              <span>{authorAlias}</span>
              <span>·</span>
            </>
          )}
          <span>{date}</span>
          <span>·</span>
          <span>{sceneCount}장면</span>
          {/* Sprint 2-H: Social proof — hide low counts, show badges */}
          {viewCount !== undefined && viewCount >= 5 && (
            <>
              <span>·</span>
              <span>조회 {viewCount}</span>
            </>
          )}
          {likeCount !== undefined && likeCount >= 5 && (
            <>
              <span>·</span>
              <span>공감 {likeCount}</span>
            </>
          )}
          {likeCount !== undefined && likeCount >= 10 && (
            <>
              <span>·</span>
              <span className="text-coral font-medium">인기</span>
            </>
          )}
          {(viewCount === undefined || viewCount < 5) && (likeCount === undefined || likeCount < 5) && (
            <>
              <span>·</span>
              <span className="text-brown-pale">최근 공유됨</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
});
