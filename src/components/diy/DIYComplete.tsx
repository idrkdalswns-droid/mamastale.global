"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PopupBookViewer } from "./PopupBookViewer";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDIYStore } from "@/lib/hooks/useDIY";
import { createClient } from "@/lib/supabase/client";

const VALID_TOPICS = ["parenting", "healing", "growth", "relationship", "identity", "other"] as const;

const TOPIC_LABELS: Record<string, string> = {
  parenting: "육아",
  healing: "치유",
  growth: "성장",
  relationship: "관계",
  identity: "정체성",
  other: "기타",
};

interface DIYCompleteProps {
  storyTitle: string;
  images: string[];
  imageOrder: number[];
  texts: Record<number, string>;
  accent: string;
  thumbnail: string;
  diyStoryId: string;
  onReset: () => void;
  onBack: () => void;
}

export function DIYComplete({
  storyTitle,
  images,
  imageOrder,
  texts,
  accent,
  thumbnail,
  diyStoryId,
  onReset,
  onBack,
}: DIYCompleteProps) {
  const [reviewPage, setReviewPage] = useState(0);
  const [showBook, setShowBook] = useState(false);

  // Save to library state
  const { user } = useAuth();
  const { savedStoryId, setSavedStoryId } = useDIYStore();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Community share state
  const [showShareForm, setShowShareForm] = useState(false);
  const [authorAlias, setAuthorAlias] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("other");
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const writtenPages = imageOrder.filter((idx) => texts[idx]?.trim()).length;

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const supabase = createClient();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    } catch { /* ignore */ }
    return headers;
  }

  async function handleSaveToLibrary() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    try {
      const scenes = imageOrder.map((imgIdx, pageNum) => ({
        sceneNumber: pageNum + 1,
        title: `장면 ${pageNum + 1}`,
        text: texts[imgIdx] || "",
        imagePrompt: images[imgIdx],
      }));

      const headers = await getAuthHeaders();
      const res = await fetch("/api/stories", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          title: storyTitle,
          scenes,
          coverImage: thumbnail,
          metadata: { source: "diy", diyStoryId },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      const { id } = await res.json();
      setSavedStoryId(id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleShareToCommunity() {
    if (!savedStoryId || !authorAlias.trim()) return;
    setSharing(true);
    setShareError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/stories/${savedStoryId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          isPublic: true,
          authorAlias: authorAlias.trim(),
          topic: selectedTopic,
          coverImage: thumbnail,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "공유에 실패했습니다.");
      }

      setShareSuccess(true);
      setShowShareForm(false);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "공유에 실패했습니다.");
    } finally {
      setSharing(false);
    }
  }

  if (showBook) {
    return (
      <div className="min-h-dvh bg-cream flex flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            onClick={() => setShowBook(false)}
            className="text-[12px] text-brown-light min-h-[44px] flex items-center"
            aria-label="동화 보기 닫기"
          >
            ← 돌아가기
          </button>
          <h3 className="font-serif text-[14px] font-bold text-brown">
            {storyTitle}
          </h3>
          <div className="w-[44px]" />
        </div>
        <div className="flex-1">
          <PopupBookViewer
            images={images}
            imageOrder={imageOrder}
            texts={texts}
            currentPage={reviewPage}
            onPageChange={setReviewPage}
            accent={accent}
            editable={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-6">
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center"
      >
        <motion.div
          className="text-[56px] mb-4"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          {String.fromCodePoint(0x1F4DA)}
        </motion.div>

        <h2 className="font-serif text-xl font-bold text-brown mb-2 break-keep">
          우리 가족만의 동화가 완성됐어요!
        </h2>
        <p className="text-[13px] text-brown-light font-light leading-relaxed break-keep">
          {writtenPages > 0
            ? `${writtenPages}장의 이야기를 직접 만들었어요`
            : "이야기를 작성하면 더 특별한 동화가 돼요"}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-xs mt-8 flex flex-col gap-3"
      >
        {/* View book */}
        <button
          onClick={() => {
            setReviewPage(0);
            setShowBook(true);
          }}
          className="w-full py-3.5 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
            boxShadow: `0 8px 24px ${accent}35`,
          }}
        >
          완성된 동화 보기
        </button>

        {/* Save to library */}
        {!savedStoryId ? (
          user ? (
            <button
              onClick={handleSaveToLibrary}
              disabled={saving}
              className="w-full py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                color: "#5A9E94",
                border: "1.5px solid rgba(127,191,176,0.3)",
                background: "rgba(127,191,176,0.08)",
              }}
            >
              {saving ? "저장 중..." : "내 서재에 저장하기"}
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => {
                try {
                  sessionStorage.setItem("mamastale_diy_return", `/diy/${diyStoryId}`);
                } catch {}
              }}
              className="w-full py-3 rounded-full text-[13px] font-medium text-center no-underline transition-all active:scale-[0.97] flex items-center justify-center break-keep"
              style={{
                color: "#5A9E94",
                border: "1.5px solid rgba(127,191,176,0.3)",
                background: "rgba(127,191,176,0.08)",
              }}
            >
              로그인하면 서재에 저장할 수 있어요
            </Link>
          )
        ) : (
          <div className="text-center">
            <p className="text-[12px] text-green-600 font-medium mb-1">서재에 저장됨</p>
            {!shareSuccess && (
              <button
                onClick={() => setShowShareForm(true)}
                className="w-full py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97]"
                style={{
                  color: "#8B6AAF",
                  border: "1.5px solid rgba(139,106,175,0.25)",
                  background: "rgba(139,106,175,0.08)",
                }}
              >
                커뮤니티에 공유하기
              </button>
            )}
          </div>
        )}

        {saveError && (
          <div className="text-center">
            <p className="text-[11px] text-red-500">{saveError}</p>
            <button
              onClick={handleSaveToLibrary}
              className="text-[11px] text-brown-mid underline mt-1"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Community share success */}
        {shareSuccess && (
          <div className="text-center">
            <p className="text-[12px] text-purple font-medium mb-2">커뮤니티에 공유됐어요!</p>
            <Link
              href={`/community/${savedStoryId}`}
              className="text-[12px] text-purple font-medium no-underline underline underline-offset-2"
            >
              커뮤니티에서 보기 →
            </Link>
          </div>
        )}

        {/* Community share form */}
        {showShareForm && !shareSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-2xl p-4 overflow-hidden"
            style={{ background: "rgba(139,106,175,0.05)", border: "1px solid rgba(139,106,175,0.15)" }}
          >
            <p className="text-[13px] text-brown font-medium mb-3 break-keep">커뮤니티에 공유하기</p>

            <label className="block text-[11px] text-brown-light font-light mb-1">
              닉네임
            </label>
            <input
              type="text"
              value={authorAlias}
              onChange={(e) => setAuthorAlias(e.target.value)}
              placeholder="예: 지아맘"
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg text-[13px] text-brown bg-white border border-brown-pale/20 mb-3 focus:outline-none focus:border-purple/40"
            />

            <label className="block text-[11px] text-brown-light font-light mb-1">
              토픽
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {VALID_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: selectedTopic === topic ? "rgba(139,106,175,0.15)" : "rgba(139,106,175,0.04)",
                    color: selectedTopic === topic ? "#6D4C91" : "#8B6F5B",
                    border: `1px solid ${selectedTopic === topic ? "rgba(139,106,175,0.3)" : "rgba(139,106,175,0.1)"}`,
                  }}
                >
                  {TOPIC_LABELS[topic]}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleShareToCommunity}
                disabled={sharing || !authorAlias.trim()}
                className="flex-1 py-2.5 rounded-full text-[12px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #8B6AAF, #6D4C91)" }}
              >
                {sharing ? "공유 중..." : "공유하기"}
              </button>
              <button
                onClick={() => setShowShareForm(false)}
                className="px-4 py-2.5 rounded-full text-[11px] text-brown-pale font-light"
                style={{ border: "1px solid rgba(196,149,106,0.2)" }}
              >
                취소
              </button>
            </div>

            {shareError && (
              <p className="text-[11px] text-red-500 text-center mt-2">{shareError}</p>
            )}
          </motion.div>
        )}

        {/* Edit again */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97]"
          style={{
            color: accent,
            border: `1.5px solid ${accent}30`,
            background: `${accent}08`,
          }}
        >
          다시 편집하기
        </button>

        {/* #15: Reset — 확인 모달 + 경고 색상 */}
        <button
          onClick={() => {
            if (!window.confirm("모든 진행 상황이 초기화돼요. 처음부터 다시 만들까요?")) return;
            onReset();
          }}
          className="text-[11px] text-red-400 font-light py-2"
        >
          처음부터 다시 만들기
        </button>

        {/* Back to gallery */}
        <Link
          href="/diy"
          className="text-[11px] text-brown-light font-light py-2 no-underline text-center underline underline-offset-2 decoration-brown-pale/30"
        >
          다른 동화 고르기
        </Link>
      </motion.div>
    </div>
  );
}
