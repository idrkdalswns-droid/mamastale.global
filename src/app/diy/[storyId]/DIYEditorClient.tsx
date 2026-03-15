"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDIYStory } from "@/lib/constants/diy-stories";
import { useDIYStore } from "@/lib/hooks/useDIY";
import { ImageSorter } from "@/components/diy/ImageSorter";
import { PopupBookViewer } from "@/components/diy/PopupBookViewer";
import { DIYComplete } from "@/components/diy/DIYComplete";

const STEPS = [
  { key: "sort", label: "순서" },
  { key: "write", label: "이야기" },
  { key: "complete", label: "완성" },
] as const;

const STEP_ORDER = { sort: 0, write: 1, complete: 2 } as const;

export function DIYEditorClient() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;
  const story = getDIYStory(storyId);

  const {
    step,
    imageOrder,
    texts,
    currentPage,
    initStory,
    setImageOrder,
    setText,
    setCurrentPage,
    setStep,
    reset,
  } = useDIYStore();

  // #10: useRef로 double-init 방지
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (story && initializedRef.current !== story.id) {
      initializedRef.current = story.id;
      initStory(story.id, story.images.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // #2+#9: 작성된 페이지 수 계산
  const writtenCount = imageOrder.filter((idx) => texts[idx]?.trim()).length;
  const totalPages = imageOrder.length;

  if (!story) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-brown text-[15px] font-medium mb-2">
            동화를 찾을 수 없어요
          </p>
          <button
            onClick={() => router.push("/diy")}
            className="text-[13px] font-medium"
            style={{ color: "#E07A5F" }}
          >
            동화 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // #4: 스테퍼 컴포넌트
  const currentStepIdx = STEP_ORDER[step];
  const stepper = (
    <div className="flex items-center justify-center gap-1.5 py-2 px-4">
      {STEPS.map((s, i) => {
        const reached = i <= currentStepIdx;
        const active = step === s.key;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                active ? "text-white" : reached ? "text-white/70" : "text-brown-pale"
              }`}
              style={{
                background: active ? story.accent : reached ? `${story.accent}50` : "transparent",
                border: `1.5px solid ${active ? story.accent : `${story.accent}30`}`,
              }}
            >
              {i + 1}
            </div>
            <span className={`text-[10px] ${active ? "text-brown font-medium" : "text-brown-pale font-light"}`}>
              {s.label}
            </span>
            {i < 2 && <span className="text-brown-pale/30 text-[9px] mx-0.5">→</span>}
          </div>
        );
      })}
    </div>
  );

  // Step: Sort images
  if (step === "sort") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col">
        {/* Back button */}
        <div className="px-4 pt-3">
          <button
            onClick={() => router.push("/diy")}
            className="text-[12px] text-brown-light min-h-[44px] flex items-center"
          >
            ← 동화 목록
          </button>
        </div>
        {stepper}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          <ImageSorter
            images={story.images}
            imageOrder={imageOrder}
            onOrderChange={setImageOrder}
            onComplete={() => setStep("write")}
            accent={story.accent}
            storyTitle={story.title}
          />
        </motion.div>
      </div>
    );
  }

  // Step: Write text
  if (step === "write") {
    return (
      <div className="h-dvh bg-cream flex flex-col overflow-hidden">
        {stepper}
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-1">
          <button
            onClick={() => setStep("sort")}
            className="text-[12px] text-brown-light min-h-[44px] flex items-center"
          >
            ← 순서 변경
          </button>
          <h3 className="font-serif text-[14px] font-bold text-brown truncate max-w-[180px]">
            {story.title}
          </h3>
          {/* #2+#9: 완성 가드 + 진행 표시 */}
          <button
            onClick={() => {
              if (writtenCount === 0) {
                if (!window.confirm("아직 이야기를 작성하지 않았어요. 그래도 완성할까요?")) return;
              }
              setStep("complete");
            }}
            className="text-[12px] font-medium min-h-[44px] flex items-center"
            style={{ color: story.accent }}
          >
            완성 ({writtenCount}/{totalPages}) →
          </button>
        </div>

        {/* Book viewer with text editing */}
        <div className="flex-1">
          <PopupBookViewer
            images={story.images}
            imageOrder={imageOrder}
            texts={texts}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onTextChange={setText}
            accent={story.accent}
            editable
            storyTitle={story.title}
          />
        </div>
      </div>
    );
  }

  // Step: Complete
  return (
    <DIYComplete
      storyTitle={story.title}
      images={story.images}
      imageOrder={imageOrder}
      texts={texts}
      accent={story.accent}
      thumbnail={story.thumbnail}
      diyStoryId={story.id}
      onReset={() => {
        reset();
        initStory(story.id, story.images.length);
      }}
      onBack={() => setStep("write")}
    />
  );
}
