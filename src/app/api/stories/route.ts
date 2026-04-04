import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { containsProfanity, sanitizeText, sanitizeSceneText, VALID_TOPICS, isValidCoverImage } from "@/lib/utils/validation";
import { generateCoverImage } from "@/lib/illustration/generate";
import { uploadCoverToStorage } from "@/lib/illustration/upload";
import { createInMemoryLimiter, RATE_KEYS, checkRateLimitPersistent } from "@/lib/utils/rate-limiter";
import { resolveUser } from "@/lib/supabase/resolve-user";
import { getDIYStory } from "@/lib/constants/diy-stories";
import { calculateBlindStatus } from "@/lib/utils/blind";
import { t } from "@/lib/i18n";

const storyPostSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    title: z.string().max(200),
    text: z.string().max(5000),
  })).min(1).max(20),
  sessionId: z.string().max(100).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  isPublic: z.boolean().optional(),
  authorAlias: z.string().max(50).optional().nullable(),
  coverImage: z.string().max(2048).optional().nullable(),
  topic: z.string().max(50).optional().nullable(),
  // v1.60.2: Client-provided ticket timestamp fallback (from /api/tickets/use response)
  ticketTimestamp: z.string().max(100).optional().nullable(),
});

export const runtime = "edge";

// P1-FIX(KR-1): Rate limit + size limits for story save endpoint
const MAX_BODY_SIZE = 512_000; // 512KB max request body

// ─── Rate limiters (each has its own isolated Map) ───
const storySaveLimiter = createInMemoryLimiter(RATE_KEYS.STORY_SAVE, { maxEntries: 200 });
const storyListLimiter = createInMemoryLimiter(RATE_KEYS.STORY_LIST, { maxEntries: 200 });

// GET: List user's stories
export async function GET(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  if (!storyListLimiter.check(user.id, 15, 60_000)) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.rateLimit.tooManyRequests") }, { status: 429, headers: { "Retry-After": "60" } }));
  }

  // M-B6: Support pagination via query params (backward compatible — defaults to limit=100)
  const searchParams = new URL(request.url).searchParams;
  const pageLimit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1), 100);
  const pageOffset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  const { data: stories, count, error } = await sb.client
    .from("stories")
    // R7-F1: Include cover_image, topic, metadata (for source detection)
    // Freemium v2: include is_unlocked for lock badge
    // F5 Fix: Include scenes for accurate scene count in library grid
    // DIY free save: include expires_at for lock computation
    .select("id, title, scenes, status, is_public, is_unlocked, cover_image, topic, metadata, expires_at, blind_until, story_type, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "completed")
    // B3: 빈 장면 스토리 필터링 (0장면/null 제외)
    .not("scenes", "is", null)
    .not("scenes", "eq", "[]")
    .order("created_at", { ascending: false })
    .range(pageOffset, pageOffset + pageLimit - 1);

  if (error) {
    console.error("[Stories] List error: code=", error.code);
    return sb.applyCookies(NextResponse.json({ error: t("Errors.story.listFailed") }, { status: 500 }));
  }

  // DIY free save + blind system: query purchase flags
  let hasPurchased = false;
  let hasEverPurchased = false;
  try {
    const { data: profile } = await sb.client
      .from("profiles")
      .select("has_purchased, has_ever_purchased")
      .eq("id", user.id)
      .single();
    hasPurchased = profile?.has_purchased === true;
    hasEverPurchased = profile?.has_ever_purchased === true;
  } catch {
    // fallback: treat as not purchased (safer — shows locks)
  }

  const now = Date.now();

  // Extract source from metadata, compute scene count, don't expose raw metadata to client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeStories = (stories || []).map(({ metadata, scenes, expires_at, blind_until, ...s }: any) => {
    // DIY free save: compute is_locked
    let is_locked = false;
    if (!hasPurchased && !s.is_public && expires_at) {
      if (new Date(expires_at).getTime() < now) {
        is_locked = true;
      }
    }

    // Blind system: compute is_blinded
    const is_blinded = calculateBlindStatus(
      { blind_until },
      { has_ever_purchased: hasEverPurchased }
    );

    return {
      ...s,
      // F5 Fix: Include scenes so library grid shows accurate scene count
      scenes: Array.isArray(scenes) ? scenes : [],
      is_unlocked: s.is_unlocked ?? true, // backward compat: missing = unlocked
      source: (metadata as Record<string, unknown> | null)?.source || "ai",
      expires_at: expires_at || null,
      is_locked,
      is_blinded,
    };
  });

  // M-B6: Include total count for pagination support (backward compatible)
  return sb.applyCookies(NextResponse.json({ stories: safeStories, total: count ?? safeStories.length }));
}

// POST: Save a new story (with ticket check & deduction)
export async function POST(request: NextRequest) {
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: t("Errors.system.configError") }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request, "Stories");
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.auth.loginRequired") }, { status: 401 }));
  }

  // P0-5: Persistent rate limit (survives Edge multi-instance)
  const allowed = await checkRateLimitPersistent(`story_save:${user.id}`, 5, 60);
  if (!allowed) {
    return sb.applyCookies(NextResponse.json(
      { error: t("Errors.rateLimit.retryAfterMinute") },
      { status: 429, headers: { "Retry-After": "60" } }
    ));
  }

  // P1-FIX(KR-2): Reject oversized request bodies to prevent memory exhaustion
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return sb.applyCookies(NextResponse.json(
      { error: t("Errors.validation.requestTooLarge") },
      { status: 413 }
    ));
  }

  try {
    // Safe JSON parsing — moved BEFORE ticket check for DIY detection
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 }));
    }

    // P1-FIX(KR-2): Double-check parsed body size (content-length can be spoofed)
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > MAX_BODY_SIZE) {
      return sb.applyCookies(NextResponse.json(
        { error: t("Errors.validation.requestTooLarge") },
        { status: 413 }
      ));
    }

    const parsed = storyPostSchema.safeParse(body);
    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequestFormat") }, { status: 400 }));
    }

    const { scenes, sessionId, metadata, isPublic, coverImage, ticketTimestamp: clientTicketTimestamp } = parsed.data;
    // Server-side input sanitization: enforce max lengths, strip HTML
    const title = typeof parsed.data.title === "string" ? sanitizeText(parsed.data.title.trim().slice(0, 200)) : "";
    const authorAlias = typeof parsed.data.authorAlias === "string" ? sanitizeText(parsed.data.authorAlias.trim().slice(0, 50)) : null;

    // DIY free save: bypass ticket check for valid DIY stories
    const isDIY = metadata?.source === "diy" && typeof metadata?.diyStoryId === "string" && !!getDIYStory(metadata.diyStoryId as string);

    // Bug Bounty 3-2 FIX: Verify ticket was recently deducted via /api/tickets/use
    // Prevents direct POST to /api/stories without paying a ticket
    // 1.4 FIX: Hoist lastTicketUse for CAS clear after successful save
    // C2 FIX: Async verification pattern — save story on DB hiccup, flag for review
    let verifiedTicketTimestamp: string | undefined;
    let ticketVerificationFailed = false;
    if (!isDIY) {
      try {
        const { data: ticketProfile } = await sb.client
          .from("profiles")
          .select("metadata")
          .eq("id", user.id)
          .single();
        const ticketMeta = (ticketProfile?.metadata as Record<string, unknown>) || {};
        const lastTicketUse = ticketMeta.last_ticket_used_at as string | undefined;
        const TICKET_WINDOW_MS = 4 * 60 * 60 * 1000; // HOTFIX: 30분 → 4시간 (대화 20~60분 + 여유)
        if (!lastTicketUse) {
          // v1.60.2: Profile metadata missing — try client-provided timestamp as fallback
          // This covers the case where /api/tickets/use metadata write failed silently
          if (clientTicketTimestamp && typeof clientTicketTimestamp === "string") {
            const clientTs = new Date(clientTicketTimestamp).getTime();
            if (!isNaN(clientTs) && Date.now() - clientTs <= TICKET_WINDOW_MS) {
              console.warn("[Stories] Profile metadata missing last_ticket_used_at — using client-provided ticketTimestamp as fallback");
              verifiedTicketTimestamp = clientTicketTimestamp;
              ticketVerificationFailed = true; // Flag for review — metadata was inconsistent
            } else {
              return sb.applyCookies(NextResponse.json(
                { error: t("Errors.ticket.deductionNotConfirmed"), code: "ticket_timestamp_missing" },
                { status: 403 }
              ));
            }
          } else {
            // 타임스탬프 자체가 없음 + 클라이언트 fallback도 없음 = /api/tickets/use 미호출 → 403 유지 (보안)
            return sb.applyCookies(NextResponse.json(
              { error: t("Errors.ticket.deductionNotConfirmed"), code: "ticket_timestamp_missing" },
              { status: 403 }
            ));
          }
        } else {
          if (Date.now() - new Date(lastTicketUse).getTime() > TICKET_WINDOW_MS) {
            // 4시간 초과 — 동화 손실 방지 위해 pending 플래그로 저장
            console.warn("[Stories] Ticket window exceeded (4h) — saving with pending flag");
            ticketVerificationFailed = true;
          }
          verifiedTicketTimestamp = lastTicketUse;
        }
      } catch (ticketCheckErr) {
        // Retry once before flagging
        try {
          const { data: retryProfile } = await sb.client.from("profiles").select("metadata").eq("id", user.id).single();
          const retryMeta = (retryProfile?.metadata as Record<string, unknown>) || {};
          const retryTicketUse = retryMeta.last_ticket_used_at as string | undefined;
          const TICKET_WINDOW_MS = 4 * 60 * 60 * 1000; // HOTFIX: 30분 → 4시간
          if (!retryTicketUse) {
            return sb.applyCookies(NextResponse.json({ error: t("Errors.ticket.verificationFailed") }, { status: 500 }));
          }
          if (Date.now() - new Date(retryTicketUse).getTime() > TICKET_WINDOW_MS) {
            console.warn("[Stories] Ticket window exceeded (4h, retry path) — saving with pending flag");
            ticketVerificationFailed = true;
          }
          verifiedTicketTimestamp = retryTicketUse;
        } catch {
          // C2: DB hiccup — don't destroy user's 20-min conversation
          // Save story with pending flag, alert for manual review
          console.warn("[Stories] Ticket verification failed after retry — saving with pending flag");
          ticketVerificationFailed = true;
        }
      }
    }

    // DIY free save: check DIY story limit (max 3 for non-purchasers)
    if (isDIY) {
      const { count: diyCount } = await sb.client
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("expires_at", "is", null);
      if (diyCount !== null && diyCount >= 3) {
        return sb.applyCookies(NextResponse.json(
          { error: t("Errors.ticket.freeDiyLimit") },
          { status: 403 }
        ));
      }
    }

    // UK-2/UK-3: Profanity check on title and alias (visible in community)
    if (title && containsProfanity(title)) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.profanity.title") }, { status: 400 }));
    }
    if (authorAlias && containsProfanity(authorAlias)) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.profanity.alias") }, { status: 400 }));
    }

    // LAUNCH-FIX: Validate metadata is an object (not string/number/array)
    if (metadata !== undefined && metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidMetadataFormat") }, { status: 400 }));
    }
    // UK-5: Limit metadata size to prevent DB bloat
    if (metadata && JSON.stringify(metadata).length > 10_000) {
      return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.metadataTooLarge") }, { status: 400 }));
    }

    // Sanitize scene content — use lightweight sanitizer for AI text
    // R2-FIX(A1): Scene titles also use sanitizeSceneText (not sanitizeText) to avoid
    // HTML entity double-encoding. React JSX auto-escapes on render, so entity-encoding
    // at DB save time causes "Tom &amp; Jerry" to display as "Tom &amp;amp; Jerry".
    // H18-FIX: Removed duplicate title profanity check (already done at line 182)
    for (const s of scenes as Array<{ sceneNumber: number; title: string; text: string }>) {
      if (containsProfanity(s.title) || containsProfanity(s.text)) {
        return sb.applyCookies(NextResponse.json({ error: t("Errors.profanity.detected") }, { status: 400 }));
      }
      s.title = sanitizeSceneText(s.title.slice(0, 200));
      s.text = sanitizeSceneText(s.text.slice(0, 5000));
    }

    // Ticket deduction is now handled upfront at /api/tickets/use (chat start).
    // This endpoint only saves the completed story.

    // Freemium v2: Determine if this is the user's first completed story
    // First story → is_unlocked=false (locked preview), subsequent → is_unlocked=true
    // DIY free save: skip first-story logic for DIY (always not-first)
    let isFirstStory = false;
    if (!isDIY) {
      try {
        const { count, error: countErr } = await sb.client
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed");
        if (!countErr && count !== null) {
          isFirstStory = count === 0;
        }
      } catch {
        // fallback: treat as not-first (unlocked) — safer than locking paid content
        isFirstStory = false;
      }
    }

    // Validate session_id: must be a valid UUID or null
    // Client sends "session_${Date.now()}" which is NOT a UUID → skip FK
    const isValidUUID = sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

    // Build insert object — base columns only (always exist in DB)
    const storyInsert: Record<string, unknown> = {
      user_id: user.id,
      session_id: isValidUUID ? sessionId : null,
      title: title || "나의 마음 동화",
      scenes,
      metadata: metadata || {},
      status: "completed",
      // Freemium v2: first story is locked (preview only), subsequent are unlocked
      is_unlocked: isDIY ? true : !isFirstStory,
    };

    // DIY free save: set expires_at (3-day lock)
    if (isDIY) {
      storyInsert.expires_at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      storyInsert.story_type = "diy";
    }

    // Blind system: first story gets blind_until (N-day window)
    if (isFirstStory) {
      const BLIND_DAYS = 3; // TODO: read from site_settings when blind enabled
      storyInsert.blind_until = new Date(Date.now() + BLIND_DAYS * 24 * 60 * 60 * 1000).toISOString();
    }

    // DIY 동화: coverImage 저장 (공통 검증 함수 사용)
    if (typeof coverImage === "string" && coverImage.length > 0 && isValidCoverImage(coverImage)) {
      storyInsert.cover_image = coverImage;
    }

    // Community columns (is_public, author_alias) require 002_community migration
    // Only include if explicitly requested — graceful fallback if columns missing
    // R2-4: Strict boolean check to prevent truthy coercion (parity with PATCH handler)
    const hasCommunityFields = typeof isPublic === "boolean" || typeof authorAlias === "string";
    if (hasCommunityFields) {
      storyInsert.is_public = typeof isPublic === "boolean" ? isPublic : false;
      storyInsert.author_alias = authorAlias || null;
      // R2-FIX(B1): Save topic if valid (community topic filter support)
      if (typeof parsed.data.topic === "string" && VALID_TOPICS.includes(parsed.data.topic as typeof VALID_TOPICS[number])) {
        storyInsert.topic = parsed.data.topic;
      }
    }

    // HOTFIX: Pre-INSERT CAS clear — 1 티켓 = 1 동화 보장
    let clearedTimestamp: string | undefined;
    if (verifiedTicketTimestamp && !isDIY) {
      try {
        const { data: currentProfile } = await sb.client
          .from("profiles").select("metadata").eq("id", user.id).single();
        const currentMeta = (currentProfile?.metadata as Record<string, unknown>) || {};
        if (currentMeta.last_ticket_used_at === verifiedTicketTimestamp) {
          const { last_ticket_used_at: _cleared, ...restMeta } = currentMeta;
          await sb.client.from("profiles")
            .update({ metadata: restMeta }).eq("id", user.id);
          clearedTimestamp = verifiedTicketTimestamp;
        }
      } catch (e) {
        console.warn("[Stories] Pre-INSERT CAS clear failed (non-blocking):", e);
      }
    }

    // Try insert
    let insertResult = await sb.client
      .from("stories")
      .insert(storyInsert)
      .select("id")
      .single();

    // If insert failed and we had community columns, retry without them
    // (community migration may not be applied yet)
    if (insertResult.error && hasCommunityFields) {
      console.warn("[Stories] Retrying without community columns:", insertResult.error.message);
      delete storyInsert.is_public;
      delete storyInsert.author_alias;
      insertResult = await sb.client
        .from("stories")
        .insert(storyInsert)
        .select("id")
        .single();
    }

    if (insertResult.error || !insertResult.data) {
      console.error("[Stories] Insert failed: code=", insertResult.error?.code);
      // HOTFIX: INSERT 실패 시 CAS 타임스탬프 복원
      if (clearedTimestamp) {
        try {
          await sb.client.rpc("update_profile_metadata_field", {
            p_user_id: user.id,
            p_key: "last_ticket_used_at",
            p_value: JSON.stringify(clearedTimestamp),
          });
        } catch { /* best-effort restoration */ }
      }
      // DIY free save: skip ticket rollback for DIY stories
      if (!isDIY) {
        // B2 Fix: 티켓 롤백 with retry + failure tracking
        let rollbackSuccess = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const { incrementTickets } = await import("@/lib/supabase/tickets");
            await incrementTickets(sb.client, user.id, 1);
            console.log("[Stories] 티켓 롤백 성공 (저장 실패 복구, attempt:", attempt + 1, ")");
            rollbackSuccess = true;
            break;
          } catch (rollbackErr) {
            console.error(`[Stories] 티켓 롤백 실패 (attempt ${attempt + 1}):`, rollbackErr);
          }
        }

        if (!rollbackSuccess) {
          // B2: Record failed rollback for manual recovery + Slack alert
          console.error("[Stories] 티켓 롤백 2회 실패 — 수동 복구 필요:", { userId: user.id.slice(0, 8) });
          try {
            await sb.client.from("error_logs").insert({
              error_type: "ticket_rollback_failed",
              error_message: `Story save failed + ticket rollback failed after 2 attempts`,
              metadata: { user_id: user.id, insert_error: insertResult.error?.code },
            });
          } catch { /* best-effort logging */ }
          // Slack notification (fire-and-forget)
          const slackUrl = process.env.SLACK_CRISIS_WEBHOOK_URL;
          if (slackUrl) {
            fetch(slackUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: `🚨 [Stories] 티켓 롤백 실패 — userId: ${user.id.slice(0, 8)}... 수동 복구 필요` }),
            }).catch(() => {});
          }
          return sb.applyCookies(NextResponse.json({
            error: t("Errors.story.saveFailedNoRestore"),
            code: "ticket_rollback_failed",
          }, { status: 500 }));
        }
      }

      return sb.applyCookies(NextResponse.json({
        error: isDIY ? t("Errors.story.saveFailedRetry") : t("Errors.story.saveFailedTicketRestored"),
      }, { status: 500 }));
    }

    const storyId = insertResult.data.id;

    // C2: If ticket verification failed due to DB hiccup, flag story + alert
    if (ticketVerificationFailed) {
      // Fire-and-forget: update story metadata with pending flag
      (async () => {
        try {
          await sb.client
            .from("stories")
            .update({
              metadata: {
                ...(metadata || {}),
                ticket_verification_pending: true,
                ticket_verification_failed_at: new Date().toISOString(),
              },
            })
            .eq("id", storyId);
          console.warn("[Stories] Marked story as ticket_verification_pending:", storyId);
        } catch (e) {
          console.error("[Stories] Failed to mark pending flag:", e);
        }
      })();

      // Slack alert for manual review
      const slackUrl = process.env.SLACK_CRISIS_WEBHOOK_URL;
      if (slackUrl) {
        fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `⚠️ [Stories] 티켓 검증 실패 (DB 히컵) — storyId: ${storyId}, userId: ${user.id.slice(0, 8)}... — 수동 확인 필요`,
          }),
        }).catch(() => {});
      }
    }

    // HOTFIX: Post-INSERT CAS clear removed — now done pre-INSERT (above)

    // BS5 Fix: Cover generation fire-and-forget (don't block response)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !isFirstStory && !storyInsert.cover_image) {
      generateCoverImage(scenes, title || "").then(async (result) => {
        if (!result) return;
        const publicUrl = await uploadCoverToStorage(result.base64, result.mimeType, storyId);
        if (publicUrl) {
          await sb.client.from("stories").update({ cover_image: publicUrl }).eq("id", storyId);
        }
      }).catch((e) => {
        console.error("[Stories] Cover generation failed (non-blocking):", e);
      });
    }

    return sb.applyCookies(NextResponse.json({ id: storyId, coverGenerated: false }));
  } catch {
    return sb.applyCookies(NextResponse.json({ error: t("Errors.validation.invalidRequest") }, { status: 400 }));
  }
}
