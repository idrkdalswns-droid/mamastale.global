"use client";

import { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveCover } from "@/lib/utils/default-cover";
import type { Scene } from "@/lib/types/story";

// 크림색 SVG placeholder (base64)
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVlZWUwIi8+PC9zdmc+";

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
  /** 이미지 비율 — 커뮤니티 2열은 "3/4", 기본값 "16/9" */
  aspectRatio?: string;
  /** 2열 모드 — 메타 축소, 텍스트 최소화 */
  compact?: boolean;
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
  likeCount,
  coverImage,
  aspectRatio = "16/9",
  compact = false,
}: StoryCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const resolvedCover = resolveCover(coverImage, id, topic);
  const fallbackCover = resolveCover(undefined, id, topic);
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
      className={`block overflow-hidden transition-all active:scale-[0.97] no-underline ${compact ? "rounded-xl" : "rounded-2xl"}`}
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(196,149,106,0.1)",
        boxShadow: "0 2px 12px rgba(90,62,43,0.06)",
      }}
    >
      {/* Cover Image */}
      <div className="relative w-full" style={{ aspectRatio }}>
        {/* Skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-paper via-cream to-paper animate-pulse" />
        )}
        <Image
          src={imgErr ? fallbackCover : resolvedCover}
          alt={`${title || "동화"} 표지`}
          fill
          className={`object-cover object-center transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          sizes={compact ? "(max-width: 430px) 50vw, 215px" : "(max-width: 430px) 100vw, 430px"}
          loading="lazy"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgErr(true)}
        />

        {/* 토픽 태그 배지 삭제됨 */}

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-12"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Text content */}
      <div className={compact ? "p-2.5" : "p-3.5"}>
        <h3 className={`font-serif font-semibold text-brown leading-tight line-clamp-1 ${compact ? "text-[13px] mb-0.5" : "text-sm mb-1"}`}>
          {title || "나의 마음 동화"}
        </h3>

        {/* 미리보기 텍스트: compact 모드에서는 숨김 */}
        {!compact && previewText && (
          <p className="text-xs text-brown-light font-light leading-relaxed line-clamp-1 mb-2">
            {previewText}
            {isTruncated && "..."}
          </p>
        )}

        <div className={`flex items-center gap-1.5 text-brown-pale ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {authorAlias && (
            <>
              <span>{authorAlias}</span>
              <span>·</span>
            </>
          )}
          {compact ? (
            /* compact: 좋아요만 */
            <span>❤️ {likeCount ?? 0}</span>
          ) : (
            /* 기본: 날짜 + 장면수 + 좋아요 */
            <>
              <span>{date}</span>
              <span>·</span>
              <span>{sceneCount}장면</span>
              <span>·</span>
              <span>❤️ {likeCount ?? 0}</span>
              {likeCount !== undefined && likeCount >= 10 && (
                <>
                  <span>·</span>
                  <span className="text-coral font-medium">인기</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
});
