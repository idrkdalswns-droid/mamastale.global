"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDIYStory } from "@/lib/constants/diy-stories";
import { useDIYStore } from "@/lib/hooks/useDIY";
import { ImageSorter } from "@/components/diy/ImageSorter";
import { PopupBookViewer } from "@/components/diy/PopupBookViewer";
import { DIYComplete } from "@/components/diy/DIYComplete";

export default function DIYEditorPage() {
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

  useEffect(() => {
    if (story) {
      initStory(story.id, story.images.length);
    }
  }, [story, initStory]);

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
          />
        </motion.div>
      </div>
    );
  }

  // Step: Write text
  if (step === "write") {
    return (
      <div className="min-h-dvh bg-cream flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            onClick={() => setStep("sort")}
            className="text-[12px] text-brown-light min-h-[44px] flex items-center"
          >
            ← 순서 변경
          </button>
          <h3 className="font-serif text-[14px] font-bold text-brown truncate max-w-[180px]">
            {story.title}
          </h3>
          <button
            onClick={() => setStep("complete")}
            className="text-[12px] font-medium min-h-[44px] flex items-center"
            style={{ color: story.accent }}
          >
            완성 →
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
      onReset={() => {
        reset();
        initStory(story.id, story.images.length);
      }}
      onBack={() => setStep("write")}
    />
  );
}
