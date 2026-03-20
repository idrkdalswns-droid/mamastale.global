"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import type { TeacherStory } from "@/lib/types/teacher";

interface TeacherCelebrationProps {
  story: TeacherStory;
  sessionId: string | null;
  onViewStory: () => void;
  onNewStory: () => void;
}

export function TeacherCelebration({
  story,
  sessionId,
  onViewStory,
  onNewStory,
}: TeacherCelebrationProps) {
  const [coverImage, setCoverImage] = useState<string | null>(
    story.coverImage || null
  );
  const [coverLoading, setCoverLoading] = useState(!story.coverImage);
  const pollRef = useRef(0);

  // 표지 이미지 폴링 (3초 간격, 최대 30초)
  useEffect(() => {
    if (coverImage || !sessionId) {
      setCoverLoading(false);
      return;
    }

    const MAX_POLLS = 10;
    const INTERVAL = 3000;

    const poll = async () => {
      if (pollRef.current >= MAX_POLLS) {
        setCoverLoading(false);
        return;
      }
      pollRef.current++;

      try {
        const res = await fetch("/api/teacher/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.coverImage) {
            setCoverImage(data.coverImage);
            setCoverLoading(false);
            return;
          }
        }
      } catch {
        // 폴링 실패는 무시
      }

      setTimeout(poll, INTERVAL);
    };

    const timer = setTimeout(poll, INTERVAL);
    return () => clearTimeout(timer);
  }, [coverImage, sessionId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-12">
      <div className="text-center max-w-sm w-full">
        {/* 축하 이모지 */}
        <div className="text-5xl mb-4 animate-bounce">🎉</div>

        <h1 className="text-xl font-semibold text-brown mb-2">
          동화가 완성되었어요!
        </h1>

        {/* 표지 이미지 */}
        <div className="my-6">
          {coverLoading ? (
            <div className="w-48 h-48 mx-auto rounded-2xl bg-brown-pale/10 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-coral border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs text-brown-light">표지 준비 중...</p>
              </div>
            </div>
          ) : coverImage ? (
            <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden relative shadow-lg">
              <Image
                src={coverImage}
                alt="동화 표지"
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>
          ) : null}
        </div>

        {/* 동화 제목 */}
        {story.title && (
          <p className="text-lg font-medium text-brown mb-1 break-keep">
            &ldquo;{story.title}&rdquo;
          </p>
        )}

        <p className="text-sm text-brown-light mb-8">
          {story.spreads?.length || 14}스프레드
        </p>

        {/* CTA 버튼 */}
        <button
          onClick={onViewStory}
          className="w-full py-4 rounded-full text-white text-[15px] font-medium
                     transition-all active:scale-[0.97] mb-3"
          style={{
            background: "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
          }}
        >
          서재에서 보기
        </button>

        <button
          onClick={onNewStory}
          className="text-[13px] text-brown-light underline underline-offset-2
                     decoration-brown-pale/30 active:scale-[0.97] transition-all"
        >
          새 동화 만들기
        </button>
      </div>
    </div>
  );
}
