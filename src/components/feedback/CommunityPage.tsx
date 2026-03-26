"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WatercolorBlob } from "@/components/ui/WatercolorBlob";
import { useChatStore } from "@/lib/hooks/useChat";
import { useTickets } from "@/lib/hooks/useTickets";
import { authFetchOnce } from "@/lib/utils/auth-fetch";
import { getAnonymousId } from "@/lib/utils/anonymous-id";
import { containsProfanity } from "@/lib/utils/validation";

interface CommunityPageProps {
  onRestart: () => void;
  onViewStory?: () => void;
}

export function CommunityPage({ onRestart, onViewStory }: CommunityPageProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState("");
  const [alias, setAlias] = useState("");
  const { tickets: ticketsRemaining } = useTickets();
  // L-7: Persist interest votes to localStorage
  const [interestSent, setInterestSent] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("mamastale_interest_votes");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const { completedScenes, completedStoryId, storySaved, retrySaveStory } = useChatStore();

  // Interest click handler (illustration / video_story)
  const handleInterestClick = useCallback(async (featureType: "illustration" | "video_story") => {
    if (interestSent[featureType]) return;
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_type: featureType,
          story_id: completedStoryId || undefined,
          anonymous_id: getAnonymousId(),
        }),
      });
      if (res.ok) {
        const updated = { ...interestSent, [featureType]: true };
        setInterestSent(updated);
        // L-7: Persist to localStorage
        try { localStorage.setItem("mamastale_interest_votes", JSON.stringify(updated)); } catch {}
      }
    } catch { /* silent */ }
  }, [interestSent, completedStoryId]);

  // Auto-retry story save on mount (recovers from earlier save failure)
  useEffect(() => {
    if (completedScenes.length > 0 && !storySaved) {
      retrySaveStory();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ticket balance is now provided by useTickets hook (singleton cache)

  const handleShare = async () => {
    if (!completedScenes.length) return;
    // H-3: Profanity filter on alias
    if (alias.trim() && containsProfanity(alias)) {
      setShareError("부적절한 별명입니다. 다른 별명을 입력해 주세요.");
      return;
    }
    setIsSharing(true);
    setShareError("");
    try {
      let res: Response;

      if (completedStoryId && storySaved) {
        // Story already saved — just update to public (no duplicate)
        res = await authFetchOnce(`/api/stories/${completedStoryId}`, {
          method: "PATCH",
          body: JSON.stringify({
            isPublic: true,
            authorAlias: alias.trim() || "익명의 엄마",
          }),
        });
      } else {
        // Story not yet saved — create new public story
        const title = completedScenes[0]?.title
          ? `${completedScenes[0].title}의 이야기`
          : "나의 마음 동화";

        res = await authFetchOnce("/api/stories", {
          method: "POST",
          body: JSON.stringify({
            title,
            scenes: completedScenes,
            isPublic: true,
            authorAlias: alias.trim() || "익명의 엄마",
          }),
        });
      }

      if (res.status === 401) {
        setShareError("커뮤니티 공유는 로그인이 필요합니다.");
        return;
      }

      if (res.ok) {
        setShared(true);
      } else {
        setShareError("공유에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch {
      setShareError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex flex-col relative overflow-hidden pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]">
      <WatercolorBlob top={-60} right={-80} size={240} color="rgba(232,168,124,0.07)" />
      <WatercolorBlob bottom={80} left={-60} size={200} color="rgba(184,216,208,0.08)" />
      <WatercolorBlob top="40%" left={-40} size={160} color="rgba(200,184,216,0.06)" />

      <div className="flex-1 flex flex-col px-7 py-8 relative z-[1] max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-[26px] font-bold text-brown leading-tight mb-3">
            당신의 동화가<br />완성되었어요
          </h1>
          <p className="text-sm text-brown-light font-light leading-relaxed break-keep">
            세상에 하나뿐인 마음 동화를<br />
            아이에게 들려주세요
          </p>
        </div>

        {/* Stats card */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(196,149,106,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="text-center mb-4">
            <div className="text-[10px] text-brown-mid tracking-[3px] font-medium mb-3">
              나의 여정
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-coral">4</div>
                <div className="text-[10px] text-brown-light font-light mt-1">마음 단계</div>
              </div>
              <div className="w-[1px] bg-brown-pale/20" />
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-mint-deep">{completedScenes.length || "—"}</div>
                <div className="text-[10px] text-brown-light font-light mt-1">동화 장면</div>
              </div>
              <div className="w-[1px] bg-brown-pale/20" />
              <div className="text-center">
                <div className="text-2xl font-serif font-bold text-purple">1</div>
                <div className="text-[10px] text-brown-light font-light mt-1">나만의 동화</div>
              </div>
            </div>
          </div>
        </div>

        {/* View my story CTA — only when scenes exist */}
        {completedScenes.length > 0 && onViewStory && (
          <button
            onClick={onViewStory}
            className="w-full py-4 rounded-2xl text-[15px] font-medium text-white transition-all active:scale-[0.97] mb-5"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
            }}
          >
            내 동화 다시 읽기
          </button>
        )}

        {/* Share to Community card */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(200,184,216,0.1), rgba(200,184,216,0.03))",
            border: "1px solid rgba(200,184,216,0.2)",
          }}
        >
          <div className="text-center">
            <h3 className="font-serif text-[15px] font-semibold text-brown mb-2">
              커뮤니티에 동화를 공유할까요?
            </h3>
            {shared ? (
              <div>
                <p className="text-xs text-mint-deep font-medium mb-3">
                  커뮤니티에 공유되었습니다!
                </p>
                <Link
                  href="/community"
                  className="inline-block px-5 py-2.5 rounded-full text-xs font-medium text-purple no-underline"
                  style={{ border: "1.5px solid rgba(109,76,145,0.3)" }}
                >
                  커뮤니티 보러가기
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-brown-light font-light leading-relaxed mb-3 break-keep">
                  다른 엄마들에게 용기와 위로를 줄 수 있어요.<br />
                  별명으로 공유되어 익명이 보장됩니다.
                </p>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="별명 (예: 따뜻한 엄마)"
                  aria-label="커뮤니티 공유 별명"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-sans outline-none mb-3"
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(200,184,216,0.2)",
                  }}
                />
                {shareError && (
                  <div className="mb-2">
                    <p className="text-xs text-red-500 font-light">{shareError}</p>
                    {!isSharing && !shared && (
                      <button
                        onClick={handleShare}
                        className="text-xs text-coral underline underline-offset-2 mt-1"
                      >
                        다시 시도
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-full py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60 mb-2"
                  style={{
                    background: "linear-gradient(135deg, #6D4C91, #8B6FB0)",
                    boxShadow: "0 4px 16px rgba(109,76,145,0.25)",
                  }}
                >
                  {isSharing ? "공유 중..." : "커뮤니티에 공유하기"}
                </button>
                <p className="text-[10px] text-brown-pale font-light">
                  공유하지 않아도 괜찮아요 — 아래로 스크롤해 주세요
                </p>
              </>
            )}
          </div>
        </div>

        {/* Kakao Community card */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(254,229,0,0.08), rgba(254,229,0,0.02))",
            border: "1px solid rgba(254,229,0,0.15)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-kakao flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#3C1E1E">
                <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.66 6.62l-.96 3.56c-.08.3.26.54.52.37l4.24-2.82c.5.06 1.02.09 1.54.09 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-[15px] font-semibold text-brown mb-1.5">
                카카오톡 커뮤니티
              </h3>
              <p className="text-xs text-brown-light font-light leading-relaxed mb-3 break-keep">
                같은 마음을 가진 엄마들과 이야기를 나눠보세요.
              </p>
              <a
                href={process.env.NEXT_PUBLIC_KAKAO_COMMUNITY_URL || "https://open.kakao.com/o/gSSkFmii"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium no-underline transition-transform active:scale-[0.97]"
                style={{
                  background: "#FEE500",
                  color: "#3C1E1E",
                  boxShadow: "0 3px 12px rgba(254,229,0,0.25)",
                }}
              >
                카카오톡 오픈채팅 참여하기
              </a>
            </div>
          </div>
        </div>

        {/* Interest voting cards — demand assessment + vision signaling */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(232,168,124,0.06), rgba(200,184,216,0.06))",
            border: "1px solid rgba(232,168,124,0.10)",
          }}
        >
          <div className="text-center mb-4">
            <h3 className="font-serif text-[15px] font-semibold text-brown mb-1">
              다음에 만들어 볼까요?
            </h3>
            <p className="text-[11px] text-brown-light font-light leading-relaxed break-keep">
              완성된 동화를 바탕으로 더 특별한 경험을 준비하고 있어요.<br />
              관심 있는 기능에 투표해 주세요!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Illustration card */}
            <button
              onClick={() => handleInterestClick("illustration")}
              disabled={interestSent.illustration}
              className="rounded-2xl p-4 text-center transition-all active:scale-[0.97] disabled:scale-100"
              style={{
                background: interestSent.illustration
                  ? "rgba(90,158,143,0.08)"
                  : "rgba(255,255,255,0.7)",
                border: interestSent.illustration
                  ? "1.5px solid rgba(90,158,143,0.3)"
                  : "1px solid rgba(196,149,106,0.12)",
              }}
            >
              {interestSent.illustration ? (
                <>
                  <span className="text-sm block mb-1 text-mint-deep font-bold">완료</span>
                  <span className="text-xs text-mint-deep font-medium block">관심 등록 완료!</span>
                  <span className="text-[10px] text-brown-pale font-light block mt-0.5">
                    곧 만나보실 수 있어요
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-brown block">삽화 생성 <span className="text-[9px] text-brown-pale font-light">(준비 중)</span></span>
                  <span className="text-[10px] text-brown-light font-light block mt-1 leading-relaxed break-keep">
                    동화에 어울리는 일러스트를<br />AI가 그려주는 기능을 준비하고 있어요
                  </span>
                </>
              )}
            </button>

            {/* Video story card */}
            <button
              onClick={() => handleInterestClick("video_story")}
              disabled={interestSent.video_story}
              className="rounded-2xl p-4 text-center transition-all active:scale-[0.97] disabled:scale-100"
              style={{
                background: interestSent.video_story
                  ? "rgba(90,158,143,0.08)"
                  : "rgba(255,255,255,0.7)",
                border: interestSent.video_story
                  ? "1.5px solid rgba(90,158,143,0.3)"
                  : "1px solid rgba(196,149,106,0.12)",
              }}
            >
              {interestSent.video_story ? (
                <>
                  <span className="text-sm block mb-1 text-mint-deep font-bold">완료</span>
                  <span className="text-xs text-mint-deep font-medium block">관심 등록 완료!</span>
                  <span className="text-[10px] text-brown-pale font-light block mt-0.5">
                    곧 만나보실 수 있어요
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-brown block">영상 동화 <span className="text-[9px] text-brown-pale font-light">(준비 중)</span></span>
                  <span className="text-[10px] text-brown-light font-light block mt-1 leading-relaxed break-keep">
                    동화를 읽어주는 영상으로<br />만드는 기능을 준비하고 있어요
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Next story CTA — context-aware based on ticket balance */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "linear-gradient(135deg, rgba(224,122,95,0.06), rgba(224,122,95,0.02))",
            border: "1px solid rgba(224,122,95,0.12)",
          }}
        >
          <div className="text-center">
            <h3 className="font-serif text-[15px] font-semibold text-brown mb-1.5">
              또 다른 동화를 만들어 볼까요?
            </h3>
            {ticketsRemaining !== null && ticketsRemaining > 0 ? (
              <>
                <p className="text-xs text-brown-light font-light leading-relaxed mb-3 break-keep">
                  남은 횟수 <span className="text-coral font-semibold">{ticketsRemaining}회</span>로<br />
                  다른 상처, 다른 은유, 새로운 마음 동화를 만들어 보세요
                </p>
                <button
                  onClick={onRestart}
                  className="block w-full py-3.5 rounded-full text-sm font-medium text-white text-center transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                  }}
                >
                  새 동화 만들기
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-brown-light font-light leading-relaxed mb-3 break-keep">
                  커피 한 잔 값으로<br />
                  다른 상처, 다른 은유, 새로운 마음 동화가 탄생합니다
                </p>
                <Link
                  href="/pricing"
                  className="block w-full py-3.5 rounded-full text-sm font-medium text-white text-center transition-all active:scale-[0.97] no-underline"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 6px 20px rgba(224,122,95,0.3)",
                  }}
                >
                  다음 동화 만들기 · ₩4,900
                </Link>
                <Link
                  href="/pricing"
                  className="block w-full mt-2 text-[11px] text-center no-underline py-1.5 min-h-[44px] flex items-center justify-center"
                  style={{ color: "#6D4C91" }}
                >
                  또는 4권 묶음으로 24% 할인받기 →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="flex gap-2.5 mb-4">
          <Link
            href="/library"
            className="flex-1 py-3 rounded-full text-sm font-medium text-center no-underline transition-all active:scale-[0.97]"
            style={{
              background: "rgba(127,191,176,0.1)",
              color: "#5A9E8F",
              border: "1.5px solid rgba(127,191,176,0.25)",
            }}
          >
            내 서재
          </Link>
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-full text-sm font-normal text-brown-pale transition-all active:scale-[0.97]"
            style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
          >
            홈으로
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-2">
          <p className="text-[10px] text-brown-pale leading-relaxed">
            mamastale · 나의 이야기가 아이의 동화가 되다
          </p>
        </div>
      </div>
    </div>
  );
}
