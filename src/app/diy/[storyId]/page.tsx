import { getDIYStory, DIY_STORIES } from "@/lib/constants/diy-stories";
import { DIYEditorClient } from "./DIYEditorClient";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId } = await params;
  const story = getDIYStory(storyId);
  if (!story) return { title: "동화를 찾을 수 없어요 | mamastale" };
  return {
    title: `${story.title} — DIY 동화 만들기 | mamastale`,
    description: story.description,
    openGraph: {
      title: `${story.title} — DIY 동화`,
      description: story.description,
      images: [{ url: story.thumbnail }],
    },
  };
}

export function generateStaticParams() {
  return DIY_STORIES.map((s) => ({ storyId: s.id }));
}

export default function DIYEditorPage() {
  return <DIYEditorClient />;
}
