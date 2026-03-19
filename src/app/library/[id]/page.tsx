"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryViewer } from "@/components/story/StoryViewer";
import { StoryEditor } from "@/components/story/StoryEditor";
import { CoverPicker } from "@/components/story/CoverPicker";
import { CoverPickerModal } from "@/components/story/CoverPickerModal";
import { PopupBookViewer } from "@/components/diy/PopupBookViewer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/hooks/useAuth";
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
        setError("동화를 찾을 수 없습니다.");
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
      toast.error("커버 저장에 실패했어요");
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
        const body: Record<string, unknown> = { isPublic: true, authorAlias };
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
            <div className="w-[44px]" />
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
    </ErrorBoundary>
  );
}
