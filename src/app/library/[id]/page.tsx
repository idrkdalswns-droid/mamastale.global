"use client";

// Required by Cloudflare Pages for all dynamic routes
export const runtime = "edge";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryViewer } from "@/components/story/StoryViewer";
import { StoryEditor } from "@/components/story/StoryEditor";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Scene } from "@/lib/types/story";

interface StoryData {
  id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
}

export default function LibraryStoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    // Include auth token in headers (belt-and-suspenders for cookie issues)
    (async () => {
      try {
        const headers: Record<string, string> = {};
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        } catch { /* ignore */ }

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
  }, [params.id]);

  // FR-007: Save edited story via PATCH API
  const handleEditDone = useCallback(
    async (editedScenes: Scene[], editedTitle: string) => {
      if (!story) return;
      setSaving(true);
      try {
        // Include auth token for cookie fallback
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        } catch { /* ignore */ }

        const res = await fetch(`/api/stories/${story.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ title: editedTitle, scenes: editedScenes }),
        });
        if (res.ok) {
          setStory((prev) => prev ? { ...prev, title: editedTitle, scenes: editedScenes } : prev);
        }
      } catch {
        // Silently fail — user can try again
      } finally {
        setSaving(false);
        setEditing(false);
      }
    },
    [story]
  );

  if (loading || saving) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">📖</div>
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
          <div className="text-3xl mb-3">😕</div>
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
      <StoryEditor
        scenes={story.scenes}
        title={story.title}
        onDone={handleEditDone}
      />
    );
  }

  return (
    <StoryViewer
      scenes={story.scenes}
      title={story.title || "나의 마음 동화"}
      authorName={user?.user_metadata?.name || undefined}
      onBack={() => router.push("/library")}
      onEdit={() => setEditing(true)}
    />
  );
}
