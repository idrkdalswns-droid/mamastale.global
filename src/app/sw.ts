import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

/**
 * Custom runtime caching rules for mamastale
 *
 * Strategy:
 *   - API (chat, stream): NetworkOnly (defaultCache handles this)
 *   - API (stories, community, reviews): StaleWhileRevalidate (목록 데이터)
 *   - API (tickets, profile): NetworkFirst (최신 데이터 우선, 오프라인 폴백)
 *   - Google Fonts: CacheFirst (변경 없음)
 *   - Static assets: CacheFirst (이미지, 폰트 등)
 */
const mamastaleCache: RuntimeCaching[] = [
  // ── Google Fonts stylesheets ──
  {
    matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
      ],
    }),
  },
  // ── Google Fonts webfont files ──
  {
    matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
      ],
    }),
  },
  // ── Stories/Community API: SWR ──
  {
    matcher: /\/api\/(stories|community|reviews)(\/|$|\?)/i,
    handler: new StaleWhileRevalidate({
      cacheName: "mamastale-api-swr",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
    }),
  },
  // ── Tickets/Profile API: Network First ──
  {
    matcher: /\/api\/(tickets|account)(\/|$|\?)/i,
    handler: new NetworkFirst({
      cacheName: "mamastale-api-fresh",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 5, // 5 minutes
        }),
      ],
      networkTimeoutSeconds: 5,
    }),
  },
  // ── Static images ──
  {
    matcher: /\/images\/.*/i,
    handler: new CacheFirst({
      cacheName: "mamastale-images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    }),
  },
  // ── Local fonts ──
  {
    matcher: /\/fonts\/.*/i,
    handler: new CacheFirst({
      cacheName: "mamastale-fonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...mamastaleCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
