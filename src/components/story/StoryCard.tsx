"use client";

import Link from "next/link";
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
}

export function StoryCard({
  title,
  scenes,
  createdAt,
  href,
  authorAlias,
  topic,
  viewCount,
  likeCount,
}: StoryCardProps) {
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
      className="block rounded-2xl p-4 transition-all active:scale-[0.98] no-underline"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(196,149,106,0.1)",
      }}
    >
      {topic && (
        <span
          className="inline-block px-2 py-0.5 rounded text-[10px] font-medium mb-2"
          style={{ background: "rgba(196,149,106,0.1)", color: "#8B7355" }}
        >
          {topic}
        </span>
      )}

      <h3 className="font-serif text-sm font-semibold text-brown mb-1.5 leading-tight line-clamp-2">
        {title || "나의 치유 동화"}
      </h3>

      {previewText && (
        <p className="text-xs text-brown-light font-light leading-relaxed line-clamp-2 mb-3">
          {previewText}{isTruncated && "..."}
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
        {viewCount !== undefined && (
          <>
            <span>·</span>
            <span>조회 {viewCount}</span>
          </>
        )}
        {likeCount !== undefined && likeCount > 0 && (
          <>
            <span>·</span>
            <span>공감 {likeCount}</span>
          </>
        )}
      </div>
    </Link>
  );
}
