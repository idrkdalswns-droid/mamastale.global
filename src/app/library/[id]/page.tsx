"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryViewer } from "@/components/story/StoryViewer";
import { StoryEditor } from "@/components/story/StoryEditor";
import { CoverPicker } from "@/components/story/CoverPicker";
import { CoverPickerModal } from "@/components/story/CoverPickerModal";
import { PopupBookViewer } from "@/components/diy/PopupBookViewer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FocusTrapModal } from "@/components/ui/FocusTrapModal";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/hooks/useAuth";
import { tc } from "@/lib/i18n/client";
import { useAuthToken } from "@/lib/hooks/useAuthToken";
import { cleanSceneText } from "@/lib/utils/story-parser";
import type { Scene } from "@/lib/types/story";

const TOPIC_OPTIONS = [
  { value: "parenting", label: "양육" },
  { value: "healing", label: "치유" },
  { value: "growth", label: "성장" },
  { value: "relationship", label: "관계" },
  { value: "identity", label: "정체성" },
  { value: "other", label: "기타" },
];

interface StoryData {
  id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
  is_public?: boolean;
  author_alias?: string;
  topic?: string;
  cover_image?: string;
  source?: string;
  is_unlocked?: boolean;
  is_locked?: boolean;
  is_blinded?: boolean;
  story_type?: string;
  total_scenes?: number;
}

export default function LibraryStoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getHeaders } = useAuthToken();
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // R3-1+R3-2: Separate transient save error from fatal load error
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showCoverPickerAfterEdit, setShowCoverPickerAfterEdit] = useState(false);
  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // DIY story states
  const [diyPage, setDiyPage] = useState(0);
  const [showDiyShareForm, setShowDiyShareForm] = useState(false);
  const [shareAlias, setShareAlias] = useState("");
  const [shareTopic, setShareTopic] = useState("parenting");

  useEffect(() => {
    if (!params.id) return;

    (async () => {
      try {
        const headers = await getHeaders();
        const res = await fetch(`/api/stories/${params.id}`, { headers });
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setStory(data.story);
      } catch {
        setError(tc("UI.story.notFound"));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, getHeaders]);

  // FR-007: Save edited story via PATCH API
  const handleEditDone = useCallback(
    async (editedScenes: Scene[], editedTitle: string) => {
      if (!story) return;
      setSaving(true);
      try {
        const headers = await getHeaders({ json: true });
        const res = await fetch(`/api/stories/${story.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ title: editedTitle, scenes: editedScenes }),
        });
        if (res.ok) {
          setStory((prev) => prev ? { ...prev, title: editedTitle, scenes: editedScenes } : prev);
          setSaving(false);
          setEditing(false);
          setShowCoverPickerAfterEdit(true);
        } else {
          // R3-1: Keep editor open on save failure so user can retry
          setSaving(false);
          setSaveError("저장에 실패했습니다. 다시 시도해주세요.");
          setTimeout(() => setSaveError(""), 3000);
        }
      } catch {
        setSaving(false);
        setSaveError("네트워크 오류입니다. 다시 시도해주세요.");
        setTimeout(() => setSaveError(""), 3000);
      }
    },
    [story, getHeaders]
  );

  // Handle cover change from modal or post-edit picker
  const handleCoverChange = useCallback((coverPath: string) => {
    setStory((prev) => prev ? { ...prev, cover_image: coverPath } : prev);
  }, []);

  // PATCH cover image helper (for post-edit full-screen picker)
  const patchCover = useCallback(async (storyId: string, coverPath: string) => {
    try {
      const headers = await getHeaders({ json: true });
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ coverImage: coverPath }),
      });
      if (!res.ok) throw new Error("PATCH failed");
    } catch {
      toast.error(tc("UI.common.coverSaveFailedShort"));
      throw new Error("cover_patch_failed");
    }
  }, [getHeaders]);

  // Publish to community (Sprint 2-B: accepts optional topic keyword)
  const handlePublish = useCallback(
    async (authorAlias: string, topic?: string) => {
      if (!story) return;
      setPublishing(true);
      try {
        const headers = await getHeaders({ json: true });
        const body: Record<string, unknown> = { isPublic: true, authorAlias: authorAlias.trim() };
        if (topic) body.topic = topic;
        const res = await fetch(`/api/stories/${story.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setStory((prev) => prev ? { ...prev, is_public: true, author_alias: authorAlias } : prev);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setPublishing(false);
      }
    },
    [story, getHeaders]
  );

  // Unpublish from community
  const handleUnpublish = useCallback(
    async () => {
      if (!story) return;
      setPublishing(true);
      try {
        const headers = await getHeaders({ json: true });
        const res = await fetch(`/api/stories/${story.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ isPublic: false }),
        });
        if (res.ok) {
          setStory((prev) => prev ? { ...prev, is_public: false } : prev);
        }
      } catch {
        // Silently fail
      } finally {
        setPublishing(false);
      }
    },
    [story, getHeaders]
  );

  // Delete story
  const handleDeleteStory = useCallback(async () => {
    if (!story?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(tc("UI.common.deleteSuccess"));
      setShowDeleteConfirm(false);
      router.push("/library");
    } catch {
      toast.error(tc("UI.common.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  }, [story?.id, isDeleting, getHeaders, router]);

  if (loading || saving) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse" style={{ background: "rgba(196,149,106,0.12)" }}>
            <span className="text-lg font-serif font-bold" style={{ color: "#C4956A" }}>M</span>
          </div>
          <p className="text-sm text-brown-light font-light">
            {saving ? "저장하는 중..." : "불러오는 중..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(224,122,95,0.12)" }}>
            <span className="text-lg font-serif font-bold" style={{ color: "#E07A5F" }}>!</span>
          </div>
          <p className="text-sm text-brown-light font-light mb-4">{error || "동화를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push("/library")}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-brown-mid"
            style={{ border: "1.5px solid rgba(196,149,106,0.25)" }}
          >
            내 서재로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // If story is blinded (free trial expired), show purchase prompt
  if (story && story.is_blinded) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6" style={{ background: "rgb(var(--cream))" }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--brown-pale))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <path d="M1 1l22 22" />
          </svg>
          <h2 className="text-[18px] font-bold mb-2" style={{ color: "rgb(var(--brown))" }}>
            무료 열람 기간이 지났어요
          </h2>
          <p className="text-[13px] mb-6 break-keep" style={{ color: "rgb(var(--brown-light))" }}>
            티켓을 구매하면 모든 동화를 영구적으로 읽을 수 있어요
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-6 py-3 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)", boxShadow: "0 6px 20px rgba(224,122,95,0.3)" }}
          >
            전체 이야기 읽기
          </button>
          <button
            onClick={() => router.push("/library")}
            className="block mx-auto mt-4 text-[12px] underline"
            style={{ color: "rgb(var(--brown-pale))" }}
          >
            서재로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // If story is locked, show purchase prompt
  if (story && story.is_locked) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6" style={{ background: "rgb(var(--cream))" }}>
        <div className="text-center">
          <span className="text-5xl mb-4 block">{String.fromCodePoint(0x1F49B)}</span>
          <h2 className="text-[18px] font-bold mb-2" style={{ color: "rgb(var(--brown))" }}>
            소중한 동화가 기다리고 있어요
          </h2>
          <p className="text-[13px] mb-6" style={{ color: "rgb(var(--brown-light))" }}>
            티켓을 구매하면 언제든 다시 만날 수 있어요
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-6 py-3 rounded-full text-white text-[14px] font-medium"
            style={{ background: "linear-gradient(135deg, #E07A5F, #C96B52)" }}
          >
            티켓 구매하고 다시 만나기
          </button>
          <button
            onClick={() => router.push("/library")}
            className="block mx-auto mt-4 text-[12px] underline"
            style={{ color: "rgb(var(--brown-pale))" }}
          >
            서재로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // FR-007: Edit mode
  if (editing) {
    return (
      <ErrorBoundary fullScreen>
        <StoryEditor
          scenes={story.scenes}
          title={story.title}
          onDone={handleEditDone}
        />
        {/* R3-2: Save error toast (doesn't block editing) */}
        {saveError && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-2 duration-300" role="alert">
            <div className="px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-lg" style={{ background: "rgba(224,122,95,0.92)" }}>
              {saveError}
            </div>
          </div>
        )}
      </ErrorBoundary>
    );
  }

  // Post-edit cover selection (full-screen, same UX as post-creation flow)
  if (showCoverPickerAfterEdit) {
    return (
      <ErrorBoundary fullScreen>
        <CoverPicker
          storyTitle={story.title || "나의 마음 동화"}
          authorName={user?.user_metadata?.name || undefined}
          onSelect={async (coverPath) => {
            try {
              await patchCover(story.id, coverPath);
              handleCoverChange(coverPath);
            } catch { /* toast already shown in patchCover */ }
            setShowCoverPickerAfterEdit(false);
          }}
          onSkip={() => setShowCoverPickerAfterEdit(false)}
        />
      </ErrorBoundary>
    );
  }

  // DIY story: use PopupBookViewer in read-only mode (StoryViewer untouched)
  if (story.source === "diy") {
    const diyImages = story.scenes.map(s => s.imagePrompt).filter((v): v is string => !!v);
    const diyOrder = diyImages.map((_, i) => i);
    const diyTexts: Record<number, string> = {};
    story.scenes.forEach((s, i) => {
      if (s.text) diyTexts[i] = cleanSceneText(s.text);
    });

    return (
      <ErrorBoundary fullScreen>
        <div className="h-dvh bg-cream flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => router.push("/library")}
              className="text-[12px] text-brown-light min-h-[44px] flex items-center"
            >
              ← 서재
            </button>
            <h2 className="text-[14px] font-serif font-bold text-brown truncate max-w-[200px]">
              {story.title || "DIY 동화"}
            </h2>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-brown-pale active:scale-[0.9] transition-transform"
              aria-label="동화 삭제"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M5 6v11a2 2 0 002 2h6a2 2 0 002-2V6" />
                <path d="M9 10v5M11 10v5" />
              </svg>
            </button>
          </div>

          {/* PopupBookViewer read-only */}
          <div className="flex-1 min-h-0">
            <PopupBookViewer
              images={diyImages}
              imageOrder={diyOrder}
              texts={diyTexts}
              currentPage={diyPage}
              onPageChange={setDiyPage}
              accent="#8B6AAF"
              editable={false}
              storyTitle={story.title}
            />
          </div>

          {/* Bottom actions: community share */}
          <div className="shrink-0 px-4 pb-4 pt-2">
            {!story.is_public ? (
              showDiyShareForm ? (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(139,106,175,0.05)", border: "1px solid rgba(139,106,175,0.15)" }}>
                  <p className="text-[13px] text-brown font-medium mb-1 break-keep">커뮤니티에 공유하기</p>
                  <input
                    type="text"
                    value={shareAlias}
                    onChange={e => setShareAlias(e.target.value)}
                    placeholder="닉네임 (예: 지아맘)"
                    maxLength={50}
                    className="w-full px-3 py-2 rounded-lg text-[13px] text-brown bg-white border border-brown-pale/20 focus:outline-none focus:border-purple/40"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {TOPIC_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setShareTopic(t.value)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={{
                          background: shareTopic === t.value ? "rgba(139,106,175,0.15)" : "rgba(139,106,175,0.04)",
                          color: shareTopic === t.value ? "#6D4C91" : "#8B6F5B",
                          border: `1px solid ${shareTopic === t.value ? "rgba(139,106,175,0.3)" : "rgba(139,106,175,0.1)"}`,
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const ok = await handlePublish(shareAlias.trim(), shareTopic);
                        if (ok) setShowDiyShareForm(false);
                      }}
                      disabled={!shareAlias.trim() || publishing}
                      className="flex-1 py-2.5 rounded-full text-[12px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #8B6AAF, #6D4C91)" }}
                    >
                      {publishing ? "공유 중..." : "공유하기"}
                    </button>
                    <button
                      onClick={() => setShowDiyShareForm(false)}
                      className="px-4 py-2.5 rounded-full text-[11px] text-brown-pale font-light"
                      style={{ border: "1px solid rgba(196,149,106,0.2)" }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDiyShareForm(true)}
                  className="w-full py-3 rounded-full text-[13px] font-medium text-white transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #8B6AAF, #6D4C91)", boxShadow: "0 4px 16px rgba(139,106,175,0.25)" }}
                >
                  커뮤니티에 공유하기
                </button>
              )
            ) : (
              <div className="text-center text-[12px] text-brown-light py-2">
                ✓ 커뮤니티에 공유됨
              </div>
            )}
          </div>

          {/* 삭제 확인 모달 */}
          <FocusTrapModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} label="동화 삭제 확인" role="alertdialog">
            <div className="bg-white rounded-2xl p-5 mx-6 max-w-[320px] shadow-xl">
              <h3 className="text-[15px] font-bold text-center mb-2" style={{ color: "rgb(var(--brown))" }}>
                이 동화를 삭제할까요?
              </h3>
              <p className="text-[12px] text-center mb-4" style={{ color: "rgb(var(--brown-light))" }}>
                삭제된 동화는 복구할 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border" style={{ borderColor: "rgb(var(--brown-pale))", color: "rgb(var(--brown))" }}>
                  취소
                </button>
                <button onClick={handleDeleteStory} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white" style={{ background: "#DC2626" }}>
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </FocusTrapModal>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fullScreen>
    <StoryViewer
      scenes={story.scenes}
      title={story.title || "나의 마음 동화"}
      authorName={user?.user_metadata?.name || undefined}
      coverImage={story.cover_image || undefined}
      storyId={story.id}
      onBack={() => router.push("/library")}
      onEdit={() => setEditing(true)}
      onChangeCover={() => setShowCoverPicker(true)}
      isPublished={!!story.is_public}
      isPublishing={publishing}
      onPublish={handlePublish}
      onUnpublish={handleUnpublish}
      suggestedTags={story.topic ? [story.topic] : undefined}
      isLocked={story.is_unlocked === false}
      totalScenes={story.total_scenes}
      onUnlock={() => router.push("/pricing")}
      onDelete={() => setShowDeleteConfirm(true)}
      showCoverCTA={!story.cover_image}
      onSelectCover={() => setShowCoverPicker(true)}
    />

    {/* Cover picker modal (from viewer "표지" button) */}
    <CoverPickerModal
      isOpen={showCoverPicker}
      storyId={story.id}
      storyTitle={story.title || "나의 마음 동화"}
      authorName={user?.user_metadata?.name || undefined}
      onCoverChange={handleCoverChange}
      onClose={() => setShowCoverPicker(false)}
    />

    {/* 삭제 확인 모달 */}
    <FocusTrapModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} label="동화 삭제 확인" role="alertdialog">
      <div className="bg-white rounded-2xl p-5 mx-6 max-w-[320px] shadow-xl">
        <h3 className="text-[15px] font-bold text-center mb-2" style={{ color: "rgb(var(--brown))" }}>
          이 동화를 삭제할까요?
        </h3>
        <p className="text-[12px] text-center mb-4" style={{ color: "rgb(var(--brown-light))" }}>
          삭제된 동화는 복구할 수 없습니다.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border" style={{ borderColor: "rgb(var(--brown-pale))", color: "rgb(var(--brown))" }}>
            취소
          </button>
          <button onClick={handleDeleteStory} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white" style={{ background: "#DC2626" }}>
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </FocusTrapModal>
    </ErrorBoundary>
  );
}
