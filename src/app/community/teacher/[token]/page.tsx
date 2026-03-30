import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import TeacherStoryClient from "./TeacherStoryClient";

export const runtime = "edge";

/** Service role client to bypass RLS on teacher_stories (anon SELECT blocked) */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mamastale-global.pages.dev";
  const ogImage = `${siteUrl}/images/hero.jpg`;

  const fallback: Metadata = {
    title: "공유 동화 — mamastale",
    description: "선생님이 공유한 동화입니다. 마마스테일에서 우리 아이를 위한 동화를 만들어보세요.",
    openGraph: {
      title: "공유 동화 — mamastale",
      description: "선생님이 공유한 동화입니다.",
      type: "article",
      siteName: "mamastale",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "mamastale - 선생님 공유 동화" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "공유 동화 — mamastale",
      description: "선생님이 공유한 동화입니다.",
      images: [ogImage],
    },
  };

  try {
    const supabase = createServiceClient();
    if (!supabase) return fallback;

    const { data: story } = await supabase
      .from("teacher_stories")
      .select("title, cover_image")
      .eq("share_token", token)
      .is("deleted_at", null)
      .gt("share_expires_at", new Date().toISOString())
      .single();

    if (!story) return fallback;

    const title = story.title || "공유 동화";
    const description = "선생님이 공유한 동화입니다. 마마스테일에서 우리 아이를 위한 동화를 만들어보세요.";
    const image = story.cover_image || ogImage;

    return {
      title: `${title} — mamastale`,
      description,
      openGraph: {
        title,
        description: "선생님이 공유한 동화",
        type: "article",
        siteName: "mamastale",
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} — mamastale`,
        description,
        images: [image],
      },
    };
  } catch {
    return fallback;
  }
}

export default async function TeacherSharedStoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TeacherStoryClient token={token} />;
}
