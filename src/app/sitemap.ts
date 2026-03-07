import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mamastale-global.pages.dev";

  return [
    {
      url: base,
      lastModified: new Date("2026-03-08"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/community`,
      lastModified: new Date("2026-03-08"),
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
}
