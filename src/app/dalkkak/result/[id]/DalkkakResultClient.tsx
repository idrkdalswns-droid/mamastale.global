"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StoryViewer } from "@/components/story/StoryViewer";
import { EmotionDNACard } from "@/components/dalkkak/EmotionDNACard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useTQStore } from "@/lib/hooks/tq/useTQStore";
import { useTQEvents } from "@/lib/hooks/tq/useTQEvents";
import { useAuthToken } from "@/lib/hooks/useAuthToken";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Scene } from "@/lib/types/story";

interface TQResult {
  title: string;
  scenes: Scene[];
  emotionScores: {
    burnout: number;
    guilt: number;
    identity_loss: number;
    loneliness: number;
    hope: number;
  };
  primaryEmotion: string;
  storyId: string | null;
}

export default function DalkkakResultClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getHeaders } = useAuthToken();
  const { track } = useTQEvents();
  const { generatedScenes, primaryEmotion, storyId, sessionId, resetAll } = useTQStore();

  const [result, setResult] = useState<TQResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number | null>(null);

  const tqSessionId = params.id as string;

  // Load from store first, then API fallback
  useEffect(() => {
    if (generatedScenes.length > 0) {
      setResult({
        title: "나의 딸깍 동화",
        scenes: generatedScenes,
        emotionScores: { burnout: 0, guilt: 0, identity_loss: 0, loneliness: 0, hope: 0 },
        primaryEmotion: primaryEmotion || "hope",
        storyId: storyId,
      });
      setLoading(false);
      return;
    }

    // Fetch from API
    (async () => {
      try {
        const headers = await getHeaders();
        const res = await fetch(`/api/tq/${tqSessionId}`, { headers });
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        if (data.session?.status !== "completed") {
          router.replace("/dalkkak");
          return;
        }

        // Parse generated story into scenes
        const scenes: Scene[] = (data.story?.scenes || [])
          .filter((s: { text?: string }) => s?.text)
          .map(
            (s: { title?: string; text: string; sceneNumber?: number }, i: number) => ({
              sceneLabel: s.title || `장면 ${i + 1}`,
              text: s.text,
              imagePrompt: "",
            }),
          );

        setResult({
          title: data.story?.title || "나의 딸깍 동화",
          scenes,
          emotionScores: data.session?.emotion_scores || {
            burnout: 0, guilt: 0, identity_loss: 0, loneliness: 0, hope: 0,
          },
          primaryEmotion: data.session?.primary_emotion || "hope",
          storyId: data.session?.story_id || null,
        });
      } catch {
        router.replace("/dalkkak");
      } finally {
        setLoading(false);
      }
    })();
  }, [tqSessionId, generatedScenes, primaryEmotion, storyId, getHeaders, router]);

  const handleRating = useCallback(
    (value: number) => {
      setRating(value);
      if (sessionId) {
        track(sessionId, "feedback_submitted" as Parameters<typeof track>[1], { rating: value });
      }
    },
    [sessionId, track],
  );

  const handleBack = useCallback(() => {
    resetAll();
    router.push("/dalkkak");
  }, [resetAll, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "rgb(var(--tq-p5-bg))" }}>
        <div className="text-center">
          <div className="w-6 h-6 mx-auto mb-3 border-2 border-brown-pale/30 border-t-brown-pale rounded-full animate-spin" />
          <p className="text-sm text-brown-light font-light">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <ErrorBoundary fullScreen>
      {/* Story Viewer (reuse existing) */}
      <StoryViewer
        scenes={result.scenes}
        title={result.title}
        authorName={user?.user_metadata?.name || undefined}
        storyId={result.storyId || undefined}
        onBack={handleBack}
        onBackLabel="딸깍 동화"
      />

      {/* Post-story content */}
      <div className="pb-20 px-5" style={{ background: "rgb(var(--tq-p5-bg))" }}>
        {/* Afterglow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center py-12"
        >
          <p className="font-serif text-[16px] text-brown-light font-light italic">
            이 이야기는 당신을 위해 쓰여졌어요
          </p>
        </motion.div>

        {/* Emotion DNA Card */}
        <EmotionDNACard
          scores={result.emotionScores}
          primaryEmotion={result.primaryEmotion}
        />

        {/* Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center mt-10"
        >
          <p className="text-[13px] text-brown-light font-light mb-4">
            이 동화는 어떠셨나요?
          </p>
          <div className="flex justify-center gap-4">
            {[
              { value: 1, emoji: "😐", label: "별로" },
              { value: 2, emoji: "🙂", label: "괜찮아요" },
              { value: 3, emoji: "😊", label: "감동" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => handleRating(item.value)}
                disabled={rating !== null}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all ${
                  rating === item.value
                    ? "scale-110"
                    : rating !== null
                      ? "opacity-40"
                      : "active:scale-95"
                }`}
                style={{
                  background: rating === item.value
                    ? "rgba(196,149,106,0.1)"
                    : "transparent",
                  border: `1.5px solid ${
                    rating === item.value
                      ? "rgba(196,149,106,0.3)"
                      : "rgba(196,149,106,0.08)"
                  }`,
                }}
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-[10px] text-brown-pale">{item.label}</span>
              </button>
            ))}
          </div>
          {rating !== null && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[12px] text-brown-pale font-light mt-3"
            >
              소중한 의견 감사해요
            </motion.p>
          )}
        </motion.div>

        {/* Actions */}
        <div className="mt-10 space-y-3 max-w-sm mx-auto">
          <button
            onClick={handleBack}
            className="w-full py-3.5 rounded-full text-white text-[14px] font-medium transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #9B8EC4, #7B6FA0)",
              boxShadow: "0 6px 24px rgba(155,142,196,0.3)",
            }}
          >
            새로운 딸깍 동화 만들기
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 text-[12px] text-brown-pale underline underline-offset-2 decoration-brown-pale/30"
          >
            다른 서비스도 만나보세요
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
