import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import CommunityStoryClient from "./CommunityStoryClient";

// Required by Cloudflare Pages for all dynamic routes
export const runtime = "edge";

/** Anon-key client for public reads (no cookies needed) */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const fallback: Metadata = {
    title: "마음 동화 | mamastale",
    description: "엄마의 마음이 담긴 세상에 하나뿐인 마음 동화입니다.",
    openGraph: {
      title: "마음 동화 | mamastale",
      description: "엄마의 마음이 담긴 세상에 하나뿐인 마음 동화입니다.",
      type: "article",
    },
  };

  try {
    const supabase = createAnonClient();
    if (!supabase) return fallback;

    const { data: story } = await supabase
      .from("stories")
      .select("title, scenes, author_alias")
      .eq("id", id)
      .eq("is_public", true)
      .single();

    if (!story) return fallback;

    const title = story.title || "마음 동화";
    const author = story.author_alias || "익명의 엄마";
    const firstScene = Array.isArray(story.scenes) && story.scenes.length > 0
      ? (story.scenes[0] as { text?: string }).text || ""
      : "";
    const description = firstScene.length > 100
      ? firstScene.slice(0, 100) + "..."
      : firstScene || "엄마의 마음이 담긴 세상에 하나뿐인 마음 동화입니다.";

    return {
      title: `${title} — ${author} | mamastale`,
      description,
      openGraph: {
        title: `${title} — ${author}`,
        description,
        type: "article",
        siteName: "mamastale",
      },
      twitter: {
        card: "summary",
        title: `${title} — ${author} | mamastale`,
        description,
      },
    };
  } catch {
    return fallback;
  }
}

export default function CommunityStoryPage() {
  return <CommunityStoryClient />;
}
