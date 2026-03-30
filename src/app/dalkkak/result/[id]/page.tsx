import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import DalkkakResultClient from "./DalkkakResultClient";

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

const EMOTION_LABELS: Record<string, string> = {
  burnout: "번아웃",
  guilt: "죄책감",
  identity_loss: "정체성 위기",
  loneliness: "외로움",
  hope: "희망",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mamastale.global";
  const ogImage = `${siteUrl}/images/hero.jpg`;

  const fallback: Metadata = {
    title: "딸깍 동화 결과 | mamastale",
    description: "나만의 감정을 동화로 변환한 딸깍 동화 결과입니다.",
    openGraph: {
      title: "딸깍 동화 결과 | mamastale",
      description: "나만의 감정을 동화로 변환한 딸깍 동화 결과입니다.",
      type: "article",
      siteName: "mamastale",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "mamastale - 딸깍 동화" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "딸깍 동화 결과 | mamastale",
      description: "나만의 감정을 동화로 변환한 딸깍 동화 결과입니다.",
      images: [ogImage],
    },
  };

  try {
    const supabase = createAnonClient();
    if (!supabase) return fallback;

    // Public view (051_tq_public_metadata.sql) — anon key로 조회 가능
    const { data } = await supabase
      .from("tq_public_metadata")
      .select("primary_emotion, cover_url")
      .eq("id", id)
      .single();

    if (!data) return fallback;

    const emotion = EMOTION_LABELS[data.primary_emotion] || "마음";
    const title = `${emotion}을 주제로 한 딸깍 동화`;
    const description = `${emotion}을 주제로 만들어진 나만의 치유 동화입니다.`;
    const resultOgImage = data.cover_url
      ? `${siteUrl}${data.cover_url}`
      : ogImage;
    const canonicalUrl = `${siteUrl}/dalkkak/result/${id}`;

    return {
      title: `${title} | mamastale`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "mamastale",
        url: canonicalUrl,
        images: [{ url: resultOgImage, width: 1200, height: 630, alt: `${title} - mamastale` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | mamastale`,
        description,
        images: [resultOgImage],
      },
    };
  } catch {
    return fallback;
  }
}

export default function DalkkakResultPage() {
  return <DalkkakResultClient />;
}
