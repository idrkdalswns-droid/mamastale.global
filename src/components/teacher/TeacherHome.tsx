"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { showRetryToast } from "@/components/ui/RetryableToast";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDefaultCover } from "@/lib/utils/default-cover";
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
  onWriteStory: () => void;
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
  spreads?: { spreadNumber: number; text: string; title?: string }[];
  metadata?: Record<string, unknown>;
  brief_context?: Record<string, unknown>;
  cover_image?: string | null;
  source?: string;
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
  onWriteStory,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // H4: 삭제 모달 scroll lock + cleanup 복원
  useEffect(() => {
    if (confirmDeleteId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [confirmDeleteId]);

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
        await new Promise(r => setTimeout(r, 1000));
        return fetchSharedStories(retryCount + 1);
      }
      setSharedError(true);
    } finally {
      setSharedLoading(false);
    }
  }, []);

  // Fix 2-19: AbortController to cancel fetch on unmount
  useEffect(() => {
    const controller = new AbortController();
    fetchSharedStories(0);
    return () => controller.abort();
  }, [fetchSharedStories]);

  // 삭제 핸들러
  const handleDelete = useCallback(async (storyId: string) => {
    setDeletingId(storyId);
    setConfirmDeleteId(null);

    // 옵티미스틱 UI: 즉시 제거
    setSharedStories(prev => prev ? prev.filter(s => s.id !== storyId) : prev);

    try {
      const res = await fetch(`/api/teacher/stories/${storyId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("delete failed");
      }
      toast.success("동화가 삭제되었습니다.");
    } catch {
      showRetryToast("삭제에 실패했습니다.", () => handleDelete(storyId));
      // 롤백: 다시 불러오기
      fetchSharedStories();
    } finally {
      setDeletingId(null);
    }
  }, [fetchSharedStories]);

  const hasInProgressChat = messages.length > 0 && onboarding && currentPhase !== "DONE";
  const hasIncompleteOnboarding = !onboarding && currentPhase !== "DONE";

  // 커버이미지 결정
  const getCover = (story: StoryListItem) => {
    if (story.cover_image) return story.cover_image;
    return getDefaultCover(story.id);
  };

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
          <div className="flex items-center gap-2">
            <a
              href="/pricing?tab=worksheet&returnTo=teacher"
              className="text-xs text-brown-light p-2 active:scale-[0.95] transition-transform"
            >
              티켓
            </a>
            <span className="text-brown-pale/30">·</span>
            <button
              onClick={() => signOut()}
              className="text-xs text-brown-pale p-2 active:scale-[0.95] transition-transform"
            >
              로그아웃
            </button>
          </div>
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
              <div className="w-10 h-10 rounded-xl bg-mint-deep/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7FBFB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brown">진행 중인 대화 이어하기</p>
                <p className="text-xs text-brown-light mt-0.5 truncate">
                  {(() => {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === "user" && !m.isError);
                    if (lastUserMsg) return lastUserMsg.content.slice(0, 40);
                    const lastValidAI = [...messages].reverse().find(m => !m.isError);
                    if (lastValidAI) return lastValidAI.content.slice(0, 40);
                    return "대화를 이어하세요";
                  })()}
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
              <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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

        {/* CTA 영역: AI 만들기 + 직접 작성 */}
        <div className="space-y-2">
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
          <button
            onClick={onWriteStory}
            className="w-full py-3 rounded-full text-center
                       border border-brown-pale/30 transition-all active:scale-[0.97]
                       bg-paper/60"
          >
            <span className="text-brown text-[14px] font-medium">직접 동화 작성하기</span>
            <span className="block text-[11px] text-brown-pale mt-0.5">
              직접 타이핑하거나 외부 동화를 붙여넣기
            </span>
          </button>
        </div>

        {/* 우리 유치원 서재 */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-brown mb-3">우리 유치원 서재</h3>

          {sharedLoading && (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden bg-paper animate-pulse">
                  <div className="aspect-[3/4] bg-brown-pale/10" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-brown-pale/10 rounded w-3/4" />
                    <div className="h-2 bg-brown-pale/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
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
                아직 동화가 없어요.
              </p>
              <p className="text-xs text-brown-pale mt-1 break-keep">
                AI로 만들거나, 직접 작성해보세요!
              </p>
            </div>
          )}

          {!sharedLoading && !sharedError && sharedStories && sharedStories.length > 0 && (
            <div className="grid grid-cols-2 gap-3" role="list">
              {sharedStories.map((story) => {
                const isDeleting = deletingId === story.id;

                return (
                  <div
                    key={story.id}
                    role="listitem"
                    className={`rounded-xl overflow-hidden transition-all relative
                               ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(196,149,106,0.1)",
                      boxShadow: "0 2px 12px rgba(90,62,43,0.06)",
                    }}
                  >
                    {/* 카드 클릭 영역 */}
                    <button
                      onClick={() => {
                        if (isDeleting) return;
                        onViewStory({
                          id: story.id,
                          sessionId: story.session_id,
                          title: story.title,
                          spreads: (story.spreads || []) as TeacherStory["spreads"],
                          metadata: (story.metadata || {}) as TeacherStory["metadata"],
                          briefContext: story.brief_context as TeacherStory["briefContext"],
                          coverImage: story.cover_image || null,
                          source: (story.source as "ai" | "manual") || "ai",
                          createdAt: story.created_at,
                        });
                      }}
                      disabled={isDeleting}
                      className="w-full text-left active:scale-[0.97] transition-all"
                      aria-label={`${story.title || "제목 없는 동화"} 열기`}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {/* Skeleton placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-r from-paper via-cream to-paper" />
                        <Image
                          src={getCover(story)}
                          alt={story.title || "동화 표지"}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 430px) 50vw, 200px"
                          loading="lazy"
                        />
                        {/* Bottom gradient overlay */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-12"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%)" }}
                        />
                      </div>
                      <div className="p-2.5">
                        <p className="text-[13px] font-serif font-semibold text-brown leading-tight line-clamp-1">
                          {story.title || "제목 없는 동화"}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-brown-pale mt-0.5">
                          <span>
                            {new Date(story.created_at).toLocaleDateString("ko-KR", {
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          {story.author && (
                            <>
                              <span>·</span>
                              <span>{story.author}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* 삭제 버튼 — 카드 button의 sibling (클릭 전파 없음) */}
                    {story.is_mine !== false && (
                      <button
                        onClick={() => setConfirmDeleteId(story.id)}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm
                                   flex items-center justify-center text-white/80
                                   active:scale-[0.9] transition-all"
                        aria-label={isDeleting ? "삭제 중" : "삭제"}
                        aria-busy={isDeleting}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[430px] bg-paper rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]
                          animate-[slideUp_0.2s_ease-out]">
            <p className="text-sm font-medium text-brown text-center mb-1">
              이 동화를 삭제할까요?
            </p>
            <p className="text-xs text-brown-light text-center mb-5">
              삭제된 동화는 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-brown
                           border border-brown-pale/30 active:scale-[0.97] transition-all"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white
                           active:scale-[0.97] transition-all"
                style={{ background: "#E05252" }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
