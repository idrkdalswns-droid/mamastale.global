"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDownloadButton } from "@/components/story/PDFDownloadButton";
import { PublishModal } from "@/components/story/PublishModal";
import { useSwipe } from "@/lib/hooks/useSwipe";

import type { Scene } from "@/lib/types/story";
import { cleanSceneText } from "@/lib/utils/story-parser";
import { shareToKakao } from "@/lib/share/kakao";
import { trackStoryShare } from "@/lib/utils/analytics";
import { hapticLight } from "@/lib/utils/haptic";
import { useSettingsStore, FONT_SIZE_MAP } from "@/lib/hooks/useSettings";
import { authFetchOnce } from "@/lib/utils/auth-fetch";

/**
 * B-2: Detect AI-generated closing/celebration text patterns.
 * These verbose blocks ("축하합니다!", "당신은 방금~", etc.) are compressed
 * into a single card instead of full paragraphs.
 */
const CLOSING_PATTERNS = [
  /^축하합니다/,
  /^당신은 방금/,
  /^이 동화는 단순한/,
  /^이건 당신의 여정/,
  /^당신의 강함의/,
  /^당신의 사랑의/,
  /^동화가 완성되었어요/,
  /^오늘 나눈 이야기는/,
];

function isClosingText(text: string): boolean {
  const trimmed = text.trim();
  return CLOSING_PATTERNS.some((p) => p.test(trimmed));
}

/** Slide animation variants for page transitions */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

/** Page background colors — paired scenes share the same tone */
const pageBgClass: Record<number, string> = {
  0: "bg-[#EEF6F3]",
  1: "bg-[#FEF7ED]",
  2: "bg-[#F4EEF8]",
  3: "bg-[#FFF6EE]",
  4: "bg-[#FBF5EC]",
};

interface StoryViewerProps {
  scenes: Scene[];
  title?: string;
  authorName?: string;
  /** Selected cover image path (e.g. /images/covers/cover_pink01.png) */
  coverImage?: string;
  onBack?: () => void;
  onBackLabel?: string;
  onEdit?: () => void;
  embedded?: boolean;
  isPublished?: boolean;
  isPublishing?: boolean;
  onPublish?: (authorAlias: string, topic?: string) => Promise<boolean | undefined>;
  onUnpublish?: () => void;
  /** Sprint 2-C: AI-suggested topic tags (pre-selected in publish modal) */
  suggestedTags?: string[];
  /** Whether this story was generated with the premium (Opus) AI model */
  isPremium?: boolean;
  /** Callback for "new story" repurchase nudge */
  onNewStory?: () => void;
  /** Callback to open cover image picker */
  onChangeCover?: () => void;
  /** Story ID — used for localStorage key isolation (prevents title collision) */
  storyId?: string;
  /** Sprint 7-D: Remaining tickets for upsell CTA */
  ticketsRemaining?: number | null;
  /** Freemium v2: Story is locked (show 6/10 scenes with blur overlay) */
  isLocked?: boolean;
  /** Freemium v2: Total scene count (for "N scenes remaining" display) */
  totalScenes?: number;
  /** Freemium v2: Callback when user clicks unlock CTA */
  onUnlock?: () => void;
  /** Freemium v2: Preview mode — full scenes shown but PDF/share/edit hidden */
  previewMode?: boolean;
  /** Callback for delete button */
  onDelete?: () => void;
  /** Blind system: story is blinded (scenes 7+ have no text) */
  isBlinded?: boolean;
  /** Show "select cover" CTA on last page (when cover not yet chosen) */
  showCoverCTA?: boolean;
  /** Callback when user clicks cover selection CTA */
  onSelectCover?: () => void;
}

export const StoryViewer = memo(function StoryViewer({ scenes, title, authorName, coverImage, onBack, onBackLabel, onEdit, embedded, isPublished, isPublishing, onPublish, onUnpublish, suggestedTags, isPremium, onNewStory, onChangeCover, storyId, ticketsRemaining, isLocked, totalScenes: totalScenesProp, onUnlock, previewMode, onDelete, isBlinded, showCoverCTA, onSelectCover }: StoryViewerProps) {
  // ── Pagination: 2 scenes per page ──
  const totalPages = useMemo(() => Math.ceil((scenes?.length || 0) / 2), [scenes]);

  // Freemium v2: Calculate locked page boundary
  const lockedRemainingScenes = isLocked && totalScenesProp ? totalScenesProp - (scenes?.length || 0) : 0;
  // Total pages including locked ones (for grayed-out progress display)
  const totalPagesWithLocked = isLocked && totalScenesProp ? Math.ceil(totalScenesProp / 2) : totalPages;
  // Hide edit/share/PDF in locked or preview mode
  const hideActions = isLocked || previewMode;

  // M-7: Use storyId for localStorage key isolation (prevents title collision)
  // HOTFIX: 새 동화(storyId 없음)는 항상 처음부터 시작
  const pageStorageKey = storyId ? `mamastale_last_page_${storyId}` : "";
  const [currentPage, setCurrentPage] = useState(() => {
    if (!pageStorageKey) return 0; // 새 동화 또는 storyId 없음 → 항상 page 0
    try {
      const saved = parseInt(localStorage.getItem(pageStorageKey) || "0", 10);
      return saved >= 0 && saved < totalPages ? saved : 0;
    } catch { return 0; }
  });
  // Slide animation direction: -1 = prev, +1 = next
  const [direction, setDirection] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showAliasModal, setShowAliasModal] = useState(false);

  // Fetch referral code for share links
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetchOnce("/api/referral");
        if (res.ok) {
          const data = await res.json();
          if (data.code) setReferralCode(data.code);
        }
      } catch { /* guest user — no referral code */ }
    })();
  }, []);
  const [publishToast, setPublishToast] = useState<string | null>(null);

  // Persist last read page
  useEffect(() => {
    if (pageStorageKey) {
      try { localStorage.setItem(pageStorageKey, String(currentPage)); } catch {}
    }
  }, [currentPage, pageStorageKey]);

  // P1-1: Font size — useSettingsStore로 통합 (구 localStorage 키 마이그레이션 완료)
  const settingsFontSize = useSettingsStore((s) => s.fontSize);
  const setSettingsFontSize = useSettingsStore((s) => s.setFontSize);
  const fontSize = FONT_SIZE_MAP[settingsFontSize];
  const adjustFont = useCallback((delta: number) => {
    const sizes: Array<import("@/lib/hooks/useSettings").FontSize> = ["small", "medium", "large"];
    const currentIdx = sizes.indexOf(settingsFontSize);
    const nextIdx = Math.max(0, Math.min(sizes.length - 1, currentIdx + (delta > 0 ? 1 : -1)));
    setSettingsFontSize(sizes[nextIdx]);
  }, [settingsFontSize, setSettingsFontSize]);

  // Mother message (last page only)
  const motherMsgKey = storyId ? `mamastale_mother_msg_${storyId}` : title ? `mamastale_mother_msg_${title.slice(0, 40)}` : "mamastale_mother_message";
  const [motherMessage, setMotherMessage] = useState(() => {
    try { return localStorage.getItem(motherMsgKey) || ""; } catch { return ""; }
  });
  useEffect(() => {
    try {
      if (motherMessage) localStorage.setItem(motherMsgKey, motherMessage);
      else localStorage.removeItem(motherMsgKey);
    } catch {}
  }, [motherMessage, motherMsgKey]);

  // Guard: empty scenes
  if (!scenes || scenes.length === 0) {
    return (
      <div className={`${embedded ? "" : "min-h-dvh"} bg-cream flex flex-col items-center justify-center px-8 font-sans`}>
        <h2 className="font-serif text-xl text-brown font-bold mb-3">동화가 아직 준비되지 않았어요</h2>
        <p className="text-sm text-brown-light font-light text-center leading-relaxed mb-6 break-keep">
          동화 장면이 생성되지 않았습니다.<br />대화를 조금 더 이어가 주세요.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E07A5F, #C96B52)",
              boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
            }}
          >
            {onBackLabel || "뒤로가기"}
          </button>
        )}
      </div>
    );
  }

  const isFirst = currentPage === 0;
  const isLast = currentPage === totalPages - 1;
  const storyTitle = title || "나의 마음 동화";

  // Get 2 scenes for the current page
  const pageScenes = useMemo(() => {
    const startIdx = currentPage * 2;
    return scenes.slice(startIdx, startIdx + 2);
  }, [scenes, currentPage]);

  // Freemium v2: GA event when preview user reaches last page (Phase 6)
  useEffect(() => {
    if (previewMode && isLast && totalPages > 0) {
      window.gtag?.("event", "freemium_preview_complete", {
        story_id: storyId,
        total_pages: totalPages,
      });
    }
  }, [previewMode, isLast, totalPages, storyId]);

  // Swipe gestures
  const goNext = useCallback(() => { setDirection(1); setCurrentPage((p) => Math.min(totalPages - 1, p + 1)); hapticLight(); }, [totalPages]);
  const goPrev = useCallback(() => { setDirection(-1); setCurrentPage((p) => Math.max(0, p - 1)); hapticLight(); }, []);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // Build full story text for copy/share
  const buildStoryText = useCallback(() => {
    const header = `${storyTitle}\n${authorName || "어머니"}\n`;

    const body = scenes
      .map((s) => `\n${cleanSceneText(s.text)}\n`)
      .join("");

    const safeMother = motherMessage.trim().slice(0, 200);
    const motherMsg = safeMother
      ? `\n\n아이에게 전하는 한마디\n${safeMother}\n`
      : "";

    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
    const footer = `\nmamastale에서 만든 세상에 하나뿐인 동화\n${siteUrl}`;

    return header + body + motherMsg + footer;
  }, [scenes, storyTitle, authorName, motherMessage]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildStoryText());
    } catch {
      // Clipboard API not available (e.g. non-HTTPS) — try legacy fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = buildStoryText();
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        // Both methods failed — silently ignore
        return;
      }
    }
    setCopied(true);
    hapticLight();
    if (storyId) trackStoryShare(storyId, "copy");
    setTimeout(() => setCopied(false), 2000);
  }, [buildStoryText, storyId]);

  // Build share URL with referral code
  const getShareUrl = useCallback(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
    return referralCode ? `${base}/?ref=${referralCode}` : base;
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    const text = buildStoryText();
    const shareUrl = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: storyTitle, text, url: shareUrl });
        if (storyId) trackStoryShare(storyId, "native");
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  }, [buildStoryText, storyTitle, handleCopy, storyId, getShareUrl]);

  // R3-3: Cycle through 5 bg colors for pages beyond index 4
  const bgClass = pageBgClass[currentPage % 5];

  return (
    <div className={`${embedded ? "" : "min-h-dvh"} bg-cream flex flex-col font-sans`}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-paper/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            {onBack && (
              <button onClick={onBack} className="text-sm text-brown-light min-h-[44px] flex items-center">
                {onBackLabel || "뒤로"}
              </button>
            )}
            <div className="text-center flex-1">
              <div
                className="text-[10px] text-brown-mid tracking-[2px] font-medium"
                role="status"
                aria-live="polite"
                aria-label={`${currentPage + 1} / ${totalPages} 페이지`}
              >
                {currentPage + 1} / {totalPages}
              </div>
              {isPremium && (
                <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "rgba(224,122,95,0.1)", color: "#E07A5F" }}>
                  프리미엄 AI
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => adjustFont(-2)}
                className="w-11 h-11 rounded-full text-[10px] font-medium text-brown-pale active:scale-90 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                aria-label="글꼴 작게"
              >
                A-
              </button>
              {/* L-5: Font size indicator */}
              <span className="text-[10px] text-brown-pale/60 font-light w-5 text-center tabular-nums" aria-hidden="true">
                {fontSize}
              </span>
              <button
                onClick={() => adjustFont(2)}
                className="w-11 h-11 rounded-full text-[12px] font-medium text-brown-mid active:scale-90 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                aria-label="글꼴 크게"
              >
                A+
              </button>
              {onChangeCover && (
                <button
                  onClick={onChangeCover}
                  className="w-11 h-11 rounded-full text-[11px] text-brown-mid active:scale-90 transition-transform ml-1 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                  aria-label="표지 변경"
                >
                  표지
                </button>
              )}
              {onEdit && !hideActions && (
                <button
                  onClick={onEdit}
                  className="w-11 h-11 rounded-full text-[11px] text-brown-mid active:scale-90 transition-transform ml-1 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                  aria-label="동화 수정"
                >
                  수정
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="w-11 h-11 rounded-full active:scale-90 transition-transform ml-1 flex items-center justify-center text-brown-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50"
                  aria-label="동화 삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M5 6v11a2 2 0 002 2h6a2 2 0 002-2V6" />
                    <path d="M9 10v5M11 10v5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Progress — page segments (locked pages shown grayed out) */}
          <div className="flex gap-0.5 px-4 pb-2">
            {Array.from({ length: totalPagesWithLocked }, (_, i) => {
              const isLockedPage = i >= totalPages;
              return (
                <button
                  key={i}
                  onClick={() => { if (!isLockedPage) { setDirection(i > currentPage ? 1 : -1); setCurrentPage(i); } }}
                  className={`flex-1 min-h-[44px] flex items-center ${isLockedPage ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  aria-label={isLockedPage ? "잠금된 페이지" : `${i + 1}페이지로 이동`}
                  disabled={isLockedPage}
                >
                  <div
                    className="h-[6px] w-full rounded-full transition-all duration-300"
                    style={{
                      background: isLockedPage
                        ? "rgba(0,0,0,0.08)"
                        : i < currentPage ? "rgba(224,122,95,0.53)" : i === currentPage ? "#E07A5F" : "rgba(0,0,0,0.06)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page Content — 2 scenes, swipeable */}
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.15 }}
          {...swipeHandlers}
          className={`flex-1 flex flex-col px-6 py-8 ${bgClass} max-w-3xl mx-auto w-full`}
        >
          {/* Story title — shown on every page */}
          {isFirst && (
            <h1 className="font-serif text-xl text-brown font-bold mb-8 leading-tight text-center">
              {storyTitle}
            </h1>
          )}

          {/* Two scenes as two paragraphs — B-2: closing text compressed */}
          <div className="space-y-8">
            {(() => {
              const closingScenes: Scene[] = [];
              const normalScenes: Scene[] = [];
              for (const scene of pageScenes) {
                const cleaned = cleanSceneText(scene.text);
                if (isClosingText(cleaned)) {
                  closingScenes.push(scene);
                } else {
                  normalScenes.push(scene);
                }
              }
              return (
                <>
                  {normalScenes.map((scene) => (
                    <div key={scene.sceneNumber}>
                      <p className="text-[10px] text-brown-pale/60 font-light mb-1.5">
                        장면 {scene.sceneNumber}
                      </p>
                      <p
                        className="font-serif text-brown leading-[2.4] break-keep whitespace-pre-wrap transition-all"
                        style={{ fontSize: Math.max(fontSize, 17) }}
                      >
                        {cleanSceneText(scene.text)}
                      </p>
                    </div>
                  ))}
                  {closingScenes.length > 0 && (
                    <div
                      className="rounded-2xl p-5 text-center space-y-1"
                      style={{ background: "rgba(127,191,176,0.06)", border: "1px solid rgba(127,191,176,0.12)" }}
                    >
                      <p className="text-sm text-brown font-serif font-medium break-keep">
                        축하합니다! 동화가 완성되었어요 ✨
                      </p>
                      <p className="text-xs text-brown-light font-light break-keep leading-5">
                        당신의 이야기가 아이를 위한 세상에 하나뿐인 동화가 되었습니다.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Freemium v2: Lock overlay on last visible page */}
          {isLocked && isLast && lockedRemainingScenes > 0 && (
            <div className="relative mt-6">
              {/* Blur fade effect */}
              <div
                className="absolute -top-16 left-0 right-0 h-16 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(251,245,236,0.95))" }}
              />
              {/* Lock CTA card */}
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: "linear-gradient(180deg, rgb(var(--paper) / 0.95), rgb(var(--surface) / 0.98))",
                  border: "1.5px solid rgb(var(--brown-pale) / 0.15)",
                  boxShadow: "0 8px 32px rgba(90,62,43,0.06)",
                }}
                role="region"
                aria-label="잠긴 콘텐츠"
              >
                <p className="font-serif text-base text-brown font-semibold mb-1 leading-snug">
                  이야기의 결말이
                  <br />
                  기다리고 있어요
                </p>
                <p className="text-xs text-brown-light font-light mb-4">
                  {lockedRemainingScenes}장면이 남았어요
                </p>
                <button
                  onClick={() => {
                    window.gtag?.("event", "freemium_lock_cta_click", {
                      story_id: storyId,
                      remaining_scenes: lockedRemainingScenes,
                    });
                    onUnlock?.();
                  }}
                  className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] mb-2"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
                  }}
                >
                  이 순간을 간직하기
                </button>
                <p className="text-[11px] text-brown-pale font-light">
                  ₩3,920
                </p>
                <p className="text-[11px] text-brown-light font-light mt-2 break-keep leading-relaxed">
                  PDF로 인쇄해서
                  <br />
                  아이에게 읽어줄 수 있어요
                </p>
              </div>
            </div>
          )}

          {/* Blind system: blur overlay on blinded scenes */}
          {isBlinded && isLast && (
            <div className="relative mt-6">
              <div
                className="absolute -top-16 left-0 right-0 h-16 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(251,245,236,0.95))" }}
              />
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: "linear-gradient(180deg, rgb(var(--paper) / 0.95), rgb(var(--surface) / 0.98))",
                  border: "1.5px solid rgb(var(--brown-pale) / 0.15)",
                  boxShadow: "0 8px 32px rgba(90,62,43,0.06)",
                }}
                role="region"
                aria-label="블라인드 처리된 콘텐츠"
              >
                <p className="font-serif text-base text-brown font-semibold mb-1 leading-snug">
                  무료 열람 기간이 지났어요
                </p>
                <p className="text-xs text-brown-light font-light mb-4 break-keep">
                  티켓을 구매하면 모든 동화를 영구적으로 읽을 수 있어요
                </p>
                <a
                  href="/pricing"
                  className="block w-full py-3.5 rounded-full text-sm font-medium text-white no-underline transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                    boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
                  }}
                >
                  전체 이야기 읽기
                </a>
              </div>
            </div>
          )}

          {/* Last page extras */}
          {isLast && !isLocked && !isBlinded && (
            <div className="mt-8 space-y-4">
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.12)" }}
              >
                <label className="block text-xs text-brown-mid font-medium mb-2">
                  아이에게 전하고 싶은 한마디 (선택)
                </label>
                <textarea
                  value={motherMessage}
                  onChange={(e) => setMotherMessage(e.target.value)}
                  placeholder="사랑하는 우리 아이에게..."
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl font-serif bg-paper/70 border border-brown-pale/15 text-brown placeholder-brown-pale/50 outline-none resize-none leading-relaxed"
                  style={{ fontSize: 16 }}
                  aria-label="아이에게 전하는 한마디"
                />
                <p className="text-[10px] text-brown-pale font-light text-right mt-1">
                  {motherMessage.length}/200
                </p>
              </div>

              {/* Self-care message */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(127,191,176,0.06)", border: "1px solid rgba(127,191,176,0.12)" }}
              >
                <p className="text-xs text-brown-light leading-6 font-normal break-keep">
                  오늘 많은 감정을 꺼내주셨어요.
                  <br />
                  따뜻한 차 한 잔, 좋아하는 음악, 짧은 산책 등
                  <br />
                  작은 돌봄의 시간을 가져보세요.
                </p>
              </div>

              {/* 전체 삽화 예고 */}
              <div
                className="rounded-xl py-3 px-4 text-center"
                style={{ background: "rgba(139,106,175,0.06)", border: "1px solid rgba(139,106,175,0.10)" }}
              >
                <p className="text-[11px] text-brown-light font-light break-keep">
                  전체 장면 삽화는 곧 추가될 예정이에요 ✨
                </p>
              </div>

              {/* Cover selection CTA — shown when cover not yet chosen */}
              {showCoverCTA && onSelectCover && (
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{ background: "rgba(224,122,95,0.06)", border: "1px solid rgba(224,122,95,0.12)" }}
                >
                  <p className="text-[13px] text-brown font-medium mb-3 break-keep">
                    이 동화에 어울리는 표지를 골라볼까요?
                  </p>
                  <button
                    onClick={onSelectCover}
                    className="w-full py-3 rounded-full text-[14px] font-medium text-white transition-all active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                      boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
                    }}
                  >
                    표지 선택하기
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-paper/90 backdrop-blur-xl border-t border-black/[0.04]">
        <div className="max-w-3xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+12px)]">
        {isLast ? (
          <div className="space-y-2.5">
            {/* Freemium v2: Hide share/PDF in locked or preview mode */}
            {!hideActions && (
            <>
            {/* R1: 추천 공유 배너 */}
            {!previewMode && !isLocked && (
              <div className="p-3 rounded-xl text-center mb-1" style={{ background: "rgb(var(--coral) / 0.08)" }}>
                <p className="text-xs font-medium" style={{ color: "rgb(var(--coral))" }}>
                  이 이야기를 소중한 사람에게도 전해보세요
                </p>
                {referralCode ? (
                  <p className="text-[10px] text-brown-pale mt-1">추천 코드: {referralCode} · 공유하면 다음 동화 무료!</p>
                ) : (
                  <p className="text-[10px] text-brown-pale mt-1">로그인하면 추천 코드를 받을 수 있어요</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const shareUrl = getShareUrl();
                  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mamastale-global.pages.dev";
                  const ok = await shareToKakao({
                    title: storyTitle,
                    description: `${authorName || "엄마"}가 만든 세상에 하나뿐인 동화`,
                    url: shareUrl,
                    imageUrl: coverImage
                      ? coverImage.startsWith("https://") ? coverImage : `${siteUrl}${coverImage}`
                      : undefined,
                  });
                  if (!ok) {
                    if (typeof navigator !== "undefined" && navigator.share) {
                      navigator.share({ title: storyTitle, url: siteUrl }).catch(() => {});
                    } else {
                      try {
                        await navigator.clipboard.writeText(`${storyTitle} — ${authorName || "엄마"}가 만든 세상에 하나뿐인 동화 ${siteUrl}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch { /* ignore */ }
                    }
                  }
                }}
                className="flex-1 py-3.5 rounded-full text-sm font-bold transition-all active:scale-[0.97]"
                style={{
                  background: "#FEE500",
                  color: "#3C1E1E",
                }}
              >
                카카오톡
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                  boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
                }}
              >
                공유하기
              </button>
              <button
                onClick={handleCopy}
                aria-label={copied ? "복사됨" : "전체 텍스트 복사"}
                className="flex-1 py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: copied ? "rgba(127,191,176,0.15)" : "rgba(127,191,176,0.1)",
                  color: copied ? "#3D8B7A" : "#5A9E8F",
                  border: "1.5px solid rgba(127,191,176,0.3)",
                }}
              >
                {copied ? "✓ 복사됨" : "복사"}
              </button>
            </div>
            <PDFDownloadButton scenes={scenes} title={storyTitle} authorName={authorName} coverImage={coverImage} />
            {/* Community publish button */}
            {onPublish && (
              isPublished ? (
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 py-3.5 rounded-full text-sm font-medium text-center"
                    style={{ background: "rgba(127,191,176,0.12)", color: "#3D8B7A" }}
                  >
                    커뮤니티에 공유됨
                  </div>
                  {onUnpublish && (
                    <button
                      onClick={onUnpublish}
                      disabled={isPublishing}
                      className="px-4 py-3.5 rounded-full text-xs font-light text-brown-pale transition-all disabled:opacity-50"
                      style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
                    >
                      {isPublishing ? "..." : "공유 취소"}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAliasModal(true)}
                  disabled={isPublishing}
                  className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #8B6AAF, #A084C4)",
                    boxShadow: "0 4px 16px rgba(139,106,175,0.3)",
                  }}
                >
                  커뮤니티에 올리기
                </button>
              )
            )}
            {onBack && onBackLabel && (
              <button
                onClick={onBack}
                className="w-full py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #8B6AAF, #A084C4)",
                  boxShadow: "0 4px 16px rgba(139,106,175,0.3)",
                }}
              >
                {onBackLabel || "다음 단계"}
              </button>
            )}
            {/* Sprint 7-D: Enhanced upsell — ticket info + new story CTA */}
            {onNewStory && (
              <div
                className="mt-1 pt-3"
                style={{ borderTop: "1px solid rgba(196,149,106,0.1)" }}
              >
                {ticketsRemaining === null || ticketsRemaining === undefined ? (
                  <p className="text-[11px] text-brown-pale font-normal text-center mb-1.5">남은 횟수: ...</p>
                ) : (
                  <p className="text-[11px] text-brown-pale font-normal text-center mb-1.5">
                    남은 횟수: <span className={ticketsRemaining > 0 ? "text-brown-mid font-medium" : "text-coral font-medium"}>{ticketsRemaining}회</span>
                  </p>
                )}
                {ticketsRemaining === 0 ? (
                  <>
                    <p className="text-[11px] text-brown-pale font-normal text-center mb-2 break-keep">
                      다음 동화를 만들려면 추가 구매가 필요해요
                    </p>
                    <a
                      href="/pricing"
                      className="block w-full py-3 rounded-full text-[13px] font-medium text-white text-center transition-all active:scale-[0.97] no-underline"
                      style={{
                        background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                        boxShadow: "0 4px 16px rgba(224,122,95,0.25)",
                      }}
                    >
                      추가 구매하기
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-brown-pale font-normal text-center mb-2 break-keep">
                      이번엔 어떤 이야기를 들려주실 건가요?
                    </p>
                    <button
                      onClick={onNewStory}
                      className="w-full py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97]"
                      style={{
                        background: "transparent",
                        color: "#8B6F55",
                        border: "1.5px dashed rgba(196,149,106,0.3)",
                      }}
                    >
                      + 새로운 동화 만들기
                    </button>
                  </>
                )}
              </div>
            )}
            </>
            )}
            {/* Freemium v2: Preview mode bottom bar */}
            {previewMode && (
              <div
                className="py-2.5 rounded-full text-center text-xs font-light text-brown-light"
                style={{ background: "rgba(127,191,176,0.08)", border: "1px solid rgba(127,191,176,0.12)" }}
              >
                미리보기 중
              </div>
            )}
            {/* B-6: Clear labels for last page navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="flex-1 py-3 rounded-full text-sm font-light text-brown-pale transition-all"
              >
                이전 페이지
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex-1 py-3 rounded-full text-sm font-light text-brown-mid transition-all"
                  style={{ border: "1.5px solid rgba(196,149,106,0.2)" }}
                >
                  서재로 돌아가기
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={isFirst}
              className="flex-1 py-3.5 rounded-full text-sm font-medium transition-all"
              style={{
                border: "1.5px solid rgba(196,149,106,0.25)",
                color: isFirst ? "#D0C8C0" : "#8B6F55",
                background: "transparent",
              }}
            >
              이전 페이지
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              className="flex-1 py-3.5 rounded-full text-sm font-medium text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E07A5F, #C96B52)",
                boxShadow: "0 4px 16px rgba(224,122,95,0.3)",
              }}
            >
              다음 페이지
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Community publish modal */}
      <PublishModal
        isOpen={showAliasModal}
        onClose={() => setShowAliasModal(false)}
        onPublish={onPublish}
        isPublishing={isPublishing}
        suggestedTags={suggestedTags}
        onToast={(msg) => { setPublishToast(msg); setTimeout(() => setPublishToast(null), 2500); }}
      />

      {/* Publish success toast */}
      {publishToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-2 duration-300">
          <div
            className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg"
            style={{ background: "rgba(139,106,175,0.92)", backdropFilter: "blur(8px)" }}
          >
            {publishToast}
          </div>
        </div>
      )}
    </div>
  );
});
