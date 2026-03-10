"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryViewer } from "@/components/story/StoryViewer";
import { StoryEditor } from "@/components/story/StoryEditor";
import { CoverPicker } from "@/components/story/CoverPicker";
import { CoverPickerModal } from "@/components/story/CoverPickerModal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthToken } from "@/lib/hooks/useAuthToken";
import type { Scene } from "@/lib/types/story";

interface StoryData {
  id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
  is_public?: boolean;
  author_alias?: string;
  cover_image?: string;
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
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ coverImage: coverPath }),
      });
    } catch {
      console.warn("[CoverPicker] Failed to persist cover_image to DB");
    }
  }, [getHeaders]);

  // Publish to community
  const handlePublish = useCallback(
    async (authorAlias: string) => {
      if (!story) return;
      setPublishing(true);
      try {
        const headers = await getHeaders({ json: true });
        const res = await fetch(`/api/stories/${story.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ isPublic: true, authorAlias }),
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
            await patchCover(story.id, coverPath);
            handleCoverChange(coverPath);
            setShowCoverPickerAfterEdit(false);
          }}
          onSkip={() => setShowCoverPickerAfterEdit(false)}
        />
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
      onBack={() => router.push("/library")}
      onEdit={() => setEditing(true)}
      onChangeCover={() => setShowCoverPicker(true)}
      isPublished={!!story.is_public}
      isPublishing={publishing}
      onPublish={handlePublish}
      onUnpublish={handleUnpublish}
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
