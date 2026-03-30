"use client";

import { useEffect, useState, useCallback } from "react";

interface SharedStory {
  id: string;
  title: string;
  spreads: Array<{ spreadNumber: number; title?: string; text: string }>;
  coverImage: string | null;
  createdAt: string;
  ageGroup: string | null;
}

interface TeacherStoryClientProps {
  token: string;
}

export default function TeacherStoryClient({ token }: TeacherStoryClientProps) {
  const [story, setStory] = useState<SharedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSpread, setCurrentSpread] = useState(0);

  useEffect(() => {
    if (!token) return;

    const fetchStory = async () => {
      try {
        const res = await fetch(`/api/teacher/shared/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError((data as { error?: string }).error || "동화를 불러올 수 없습니다.");
          return;
        }
        const data = await res.json();
        setStory(data as SharedStory);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [token]);

  const goNext = useCallback(() => {
    if (story && currentSpread < story.spreads.length - 1) {
      setCurrentSpread((p) => p + 1);
    }
  }, [story, currentSpread]);

  const goPrev = useCallback(() => {
    if (currentSpread > 0) {
      setCurrentSpread((p) => p - 1);
    }
  }, [currentSpread]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-coral border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-brown-light text-[14px]">동화를 불러오고 있어요...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">📖</div>
          <h1 className="text-[18px] font-medium text-brown mb-2">
            동화를 찾을 수 없어요
          </h1>
          <p className="text-[14px] text-brown-light break-keep">{error}</p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 rounded-full text-white text-[14px] font-medium"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
          >
            마마스테일 시작하기
          </a>
        </div>
      </div>
    );
  }

  if (!story) return null;

  const spread = story.spreads[currentSpread];
  const ageLabel = story.ageGroup === "infant" ? "영아반" :
    story.ageGroup === "toddler" ? "유아반" :
    story.ageGroup === "age_5" ? "5세" :
    story.ageGroup === "age_6" ? "6세" :
    story.ageGroup === "age_7" ? "7세" : "";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-paper border-b border-brown-pale/20 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-medium text-brown truncate">
                {story.title || "새 동화"}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-brown-light">
                {ageLabel && <span className="bg-mint-deep/20 text-mint-deep px-2 py-0.5 rounded-full">{ageLabel}</span>}
                <span>선생님이 공유한 동화</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Viewer */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Cover image */}
        {currentSpread === 0 && story.coverImage && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <img
              src={story.coverImage}
              alt={`${story.title} 표지`}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Spread content */}
        <div className="bg-paper rounded-2xl p-6 shadow-sm min-h-[200px]">
          {spread?.title && (
            <h2 className="text-[15px] font-medium text-brown mb-3">
              {spread.title}
            </h2>
          )}
          <p
            className="text-[15px] leading-relaxed text-brown whitespace-pre-line break-keep"
            style={{ fontFamily: "'Nanum Myeongjo', 'Noto Serif KR', serif" }}
          >
            {spread?.text}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={goPrev}
            disabled={currentSpread === 0}
            className="px-4 py-2 rounded-full text-[13px] font-medium text-brown border border-brown-pale/30 disabled:opacity-30 transition-all active:scale-[0.97]"
          >
            ← 이전
          </button>
          <span className="text-[12px] text-brown-pale">
            {currentSpread + 1} / {story.spreads.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentSpread === story.spreads.length - 1}
            className="px-4 py-2 rounded-full text-[13px] font-medium text-white disabled:opacity-30 transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
          >
            다음 →
          </button>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center border-t border-brown-pale/20 pt-6">
          <p className="text-[13px] text-brown-light mb-3 break-keep">
            마마스테일에서 우리 아이를 위한 동화를 만들어보세요
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-full text-white text-[14px] font-medium"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
          >
            마마스테일 시작하기
          </a>
        </div>
      </div>
    </div>
  );
}
