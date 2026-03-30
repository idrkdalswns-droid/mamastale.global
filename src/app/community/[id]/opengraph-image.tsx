import { ImageResponse } from "next/og";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

export const alt = "mamastale - 엄마의 마음 동화";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Anon-key client for public reads (no cookies needed) */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll() { return []; }, setAll() {} },
  });
}

/** Simple hash for deterministic color selection */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 4-phase gradient palettes matching mamastale brand */
const GRADIENTS = [
  { from: "#7FBFB0", to: "#A8D8CB" },  // Phase 1 mint
  { from: "#E07A5F", to: "#F0A58E" },  // Phase 2 coral
  { from: "#8B6AAF", to: "#B89ED4" },  // Phase 3 lavender
  { from: "#C4956A", to: "#DDB892" },  // Phase 4 brown
];

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = "마음 동화";
  let author = "익명의 엄마";
  let firstScene = "";

  try {
    const supabase = createAnonClient();
    if (supabase) {
      const { data: story } = await supabase
        .from("stories")
        .select("title, scenes, author_alias")
        .eq("id", id)
        .eq("is_public", true)
        .single();

      if (story) {
        title = story.title || "마음 동화";
        author = story.author_alias || "익명의 엄마";
        if (Array.isArray(story.scenes) && story.scenes.length > 0) {
          const text = (story.scenes[0] as { text?: string }).text || "";
          firstScene = text.length > 80 ? text.slice(0, 80) + "..." : text;
        }
      }
    }
  } catch {
    // Use defaults on any error
  }

  const gradient = GRADIENTS[simpleHash(id) % GRADIENTS.length];

  // Fetch font for Korean text rendering
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuozeLTq.woff"
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 50%, #FBF5EC 100%)`,
          fontFamily: '"Noto Sans KR"',
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.06,
            background: "radial-gradient(circle at 20% 80%, #5A3E2B 0%, transparent 50%), radial-gradient(circle at 80% 20%, #5A3E2B 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#5A3E2B",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: "900px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {title}
        </div>

        {/* First scene preview */}
        {firstScene && (
          <div
            style={{
              fontSize: 24,
              color: "#8B6F55",
              textAlign: "center",
              marginTop: 24,
              maxWidth: "800px",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            {firstScene}
          </div>
        )}

        {/* Author */}
        <div
          style={{
            fontSize: 22,
            color: "#A08060",
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>by {author}</span>
        </div>

        {/* Brand footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#C4956A",
              fontWeight: 500,
              display: "flex",
            }}
          >
            mamastale
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#C4956A",
              opacity: 0.7,
              display: "flex",
            }}
          >
            AI로 만드는 나만의 동화
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Noto Sans KR",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
