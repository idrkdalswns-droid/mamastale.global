import type { MetadataRoute } from "next";
import { createServerClient } from "@supabase/ssr";

// Sprint 2-E: Dynamic sitemap with community stories
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://mamastale-global.pages.dev";
  const now = new Date();

  // ── Static pages ──
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/community`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/pricing`,
      lastModified: new Date("2026-03-08"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/reviews`,
      lastModified: new Date("2026-03-08"),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}/library`,
      lastModified: new Date("2026-03-08"),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/about`,
      lastModified: new Date("2026-03-08"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/feature-requests`,
      lastModified: new Date("2026-03-08"),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date("2026-02-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date("2026-02-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // ── Dynamic community story pages ──
  let storyPages: MetadataRoute.Sitemap = [];
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: { getAll() { return []; }, setAll() {} },
      });
      const { data: stories } = await supabase
        .from("stories")
        .select("id, created_at")
        .eq("is_public", true)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(500);

      if (stories) {
        storyPages = stories.map((story) => ({
          url: `${base}/community/${story.id}`,
          lastModified: new Date(story.created_at),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }));
      }
    }
  } catch {
    // Silently fail — static pages will still be in sitemap
  }

  return [...staticPages, ...storyPages];
}
