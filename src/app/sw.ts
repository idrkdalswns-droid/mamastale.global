import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkFirst, ExpirationPlugin } from "serwist";

// Sprint 4-A: Service Worker client/window types for push notification handlers
interface SWWindowClient {
  url: string;
  focus(): Promise<SWWindowClient>;
  navigate(url: string): Promise<SWWindowClient>;
}
interface SWClients {
  matchAll(opts?: { type?: string; includeUncontrolled?: boolean }): Promise<SWWindowClient[]>;
  openWindow(url: string): Promise<SWWindowClient | null>;
}
interface SWRegistration {
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
}

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    readonly registration: SWRegistration;
    readonly clients: SWClients;
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

// ── Sprint 4-A: Web Push Notification Handlers ──
// Type declarations for Service Worker push/notification events
// (WebWorker lib conflicts with DOM lib in tsconfig, so declare locally)
interface SWExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface PushData {
  json(): unknown;
  text(): string;
}
interface PushEventSW extends SWExtendableEvent {
  readonly data: PushData | null;
}
interface NotificationEventSW extends SWExtendableEvent {
  readonly notification: Notification & { data?: Record<string, unknown> };
  readonly action: string;
}

/**
 * Push event — display notification when push message received
 */
self.addEventListener("push", (event) => {
  const pushEvent = event as unknown as PushEventSW;
  if (!pushEvent.data) return;

  let payload: { title?: string; body?: string; icon?: string; url?: string; tag?: string };
  try {
    payload = pushEvent.data.json() as typeof payload;
  } catch {
    payload = { title: "mamastale", body: pushEvent.data.text() };
  }

  const title = payload.title || "mamastale";
  const options: NotificationOptions = {
    body: payload.body || "새로운 소식이 있어요",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: payload.tag || "mamastale-default",
    data: { url: payload.url || "/" },
  };

  pushEvent.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Notification click — open/focus the relevant page
 */
self.addEventListener("notificationclick", (event) => {
  const notifEvent = event as unknown as NotificationEventSW;
  notifEvent.notification.close();

  const targetUrl = (notifEvent.notification.data?.url as string) || "/";

  notifEvent.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes("mamastale") && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
