"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";
import type {
  TeacherOnboarding,
  TeacherMessage,
  TeacherStory,
  TeacherPhase,
} from "@/lib/types/teacher";

interface TeacherHomeProps {
  kindergartenName: string | null;
  onNewStory: () => void;
  onContinue: () => void;
  onContinueOnboarding: () => void;
  onViewStory: (story: TeacherStory) => void;
  onExit: () => void;
  messages: TeacherMessage[];
  onboarding: TeacherOnboarding | null;
  currentPhase: TeacherPhase;
  isCreatingNew: boolean;
}

interface StoryListItem {
  id: string;
  title?: string;
  created_at: string;
  spreads?: { spreadNumber: number; text: string }[];
  metadata?: Record<string, unknown>;
  brief_context?: Record<string, unknown>;
  session_id: string;
  is_mine?: boolean;
  author?: string;
}

export function TeacherHome({
  kindergartenName,
  onNewStory,
  onContinue,
  onContinueOnboarding,
  onViewStory,
  onExit,
  messages,
  onboarding,
  currentPhase,
  isCreatingNew,
}: TeacherHomeProps) {
  const { signOut } = useAuth();
  const [sharedStories, setSharedStories] = useState<StoryListItem[] | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState(false);

  const fetchSharedStories = useCallback(async (retryCount = 0) => {
    setSharedLoading(true);
    setSharedError(false);
    try {
      const res = await fetch("/api/teacher/stories?scope=shared");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setSharedStories(data.stories || []);
    } catch {
      if (retryCount < 2) {
        // 자동 재시도 (1초 후)
        await new Promise(r => setTimeout(r, 1000));
        return fetchSharedStories(retryCount + 1);
      }
      setSharedError(true);
    } finally {
      setSharedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSharedStories();
  }, [fetchSharedStories]);

  const hasInProgressChat = messages.length > 0 && onboarding && currentPhase !== "DONE";
  const hasIncompleteOnboarding = !onboarding && currentPhase !== "DONE";

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-cream">
      {/* 상단 헤더 */}
      <div className="flex-shrink-0 border-b border-brown-pale/15 bg-cream/50 backdrop-blur-sm safe-top">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onExit}
            className="p-1.5 -ml-1 text-brown-light active:scale-[0.9] transition-transform"
            aria-label="나가기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-brown">
              {kindergartenName || "선생님 모드"}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-brown-pale active:scale-[0.95] transition-transform"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* 진행 중 대화 카드 */}
        {hasInProgressChat && (
          <button
            onClick={onContinue}
            className="w-full mb-4 p-4 rounded-2xl text-left border border-brown-pale/20
                       bg-paper active:scale-[0.98] transition-all"
            style={{ boxShadow: "0 2px 12px rgba(90,62,43,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint-deep/10 flex items-center justify-center text-lg">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brown">진행 중인 대화 이어하기</p>
                <p className="text-xs text-brown-light mt-0.5 truncate">
                  {messages[messages.length - 1]?.content?.slice(0, 40) || "대화를 이어하세요"}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6F55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* 온보딩 미완료 */}
        {hasIncompleteOnboarding && (
          <button
            onClick={onContinueOnboarding}
            className="w-full mb-4 p-4 rounded-2xl text-left border border-brown-pale/20
                       bg-paper active:scale-[0.98] transition-all"
            style={{ boxShadow: "0 2px 12px rgba(90,62,43,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center text-lg">
                📝
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brown">이어서 설정하기</p>
                <p className="text-xs text-brown-light mt-0.5">온보딩을 완료하고 동화 만들기를 시작하세요</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6F55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        )}

        {/* 새 동화 만들기 CTA */}
        <button
          onClick={onNewStory}
          disabled={isCreatingNew}
          className="w-full py-4 rounded-full text-white text-[15px] font-medium
                     transition-all active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100"
          style={{
            background: isCreatingNew
              ? "#B0B0B0"
              : "linear-gradient(135deg, #E07A5F, #C96B52)",
            boxShadow: isCreatingNew
              ? "none"
              : "0 6px 24px rgba(224,122,95,0.3)",
          }}
        >
          {isCreatingNew ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              준비 중...
            </span>
          ) : (
            "새 동화 만들기"
          )}
        </button>

        {/* 우리 유치원 서재 */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-brown mb-3">우리 유치원 서재</h3>

          {sharedLoading && (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-coral border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs text-brown-light">불러오는 중...</p>
            </div>
          )}

          {sharedError && !sharedLoading && (
            <div className="text-center py-8">
              <p className="text-xs text-brown-light mb-3">공유 동화를 불러올 수 없습니다.</p>
              <button
                onClick={() => fetchSharedStories()}
                className="text-xs text-coral underline underline-offset-2"
              >
                다시 시도
              </button>
            </div>
          )}

          {!sharedLoading && !sharedError && sharedStories && sharedStories.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 relative rounded-xl overflow-hidden mx-auto mb-3">
                <Image
                  src="/images/teacher/state/generating.jpeg"
                  alt="빈 서재"
                  fill
                  className="object-cover opacity-60"
                  sizes="64px"
                />
              </div>
              <p className="text-xs text-brown-light break-keep">
                아직 다른 선생님의 동화가 없어요.
              </p>
              <p className="text-xs text-brown-pale mt-1 break-keep">
                동화를 만들면 같은 유치원 선생님들과 공유됩니다.
              </p>
            </div>
          )}

          {!sharedLoading && !sharedError && sharedStories && sharedStories.length > 0 && (
            <div className="space-y-3">
              {sharedStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() =>
                    onViewStory({
                      id: story.id,
                      sessionId: story.session_id,
                      title: story.title,
                      spreads: (story.spreads || []) as TeacherStory["spreads"],
                      metadata: (story.metadata || {}) as TeacherStory["metadata"],
                      briefContext: story.brief_context as TeacherStory["briefContext"],
                      createdAt: story.created_at,
                    })
                  }
                  className="w-full p-4 rounded-2xl text-left border border-brown-pale/15
                             bg-paper active:scale-[0.98] transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(90,62,43,0.04)" }}
                >
                  <p className="text-sm font-medium text-brown truncate">
                    {story.title || "제목 없는 동화"}
                  </p>
                  <p className="text-xs text-brown-light mt-1">
                    {new Date(story.created_at).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    · {(story.spreads || []).length}장
                    {!story.is_mine && story.author && (
                      <span className="text-brown-pale"> · {story.author}</span>
                    )}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
