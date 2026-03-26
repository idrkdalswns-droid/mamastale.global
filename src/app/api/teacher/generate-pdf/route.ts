/**
 * Teacher Mode — PDF 생성 API
 *
 * POST: 활동지 또는 읽기 가이드 HTML 생성
 *
 * Body: { type: "activity" | "guide", storyId?: string, story?: {...} }
 *   - storyId: DB에서 조회 (인증 필수)
 *   - story: 직접 전달 (미저장 동화)
 *
 * @module teacher-generate-pdf
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "edge";

import { resolveUser } from "@/lib/supabase/resolve-user";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";
import { getClientIP } from "@/lib/utils/validation";
import { generateActivitySheetHtml } from "@/lib/pdf/teacher-activity-sheet";
import { generateReadingGuideHtml } from "@/lib/pdf/teacher-reading-guide";
import { generateFreeActivityHtml } from "@/lib/pdf/teacher-free-activity";
import { createInMemoryLimiter, RATE_KEYS } from "@/lib/utils/rate-limiter";

// ─── Rate Limiter ───
const pdfLimiter = createInMemoryLimiter(RATE_KEYS.TEACHER_PDF, { maxEntries: 300 });

// ─── 스키마 ───

const spreadSchema = z.object({
  spreadNumber: z.number(),
  title: z.string().max(500).optional(),
  text: z.string().max(10_000),
});

const metadataSchema = z.object({
  readingGuide: z.string().max(20_000).optional(),
  illustPrompts: z.string().max(30_000).optional(),
  nuriMapping: z.string().max(10_000).optional(),
  devReview: z.string().max(10_000).optional(),
});

const requestSchema = z.object({
  type: z.enum(["activity", "guide", "free-activity"]),
  format: z.enum(["html", "doc"]).default("html"),
  storyId: z.string().uuid().optional(),
  story: z
    .object({
      title: z.string().max(200).optional(),
      spreads: z.array(spreadSchema).max(20),
      metadata: metadataSchema.optional(),
    })
    .optional(),
  ageGroup: z.string().max(50).optional(),
  kindergartenName: z.string().max(100).optional(),
});

const MAX_BODY_SIZE = 512_000;

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const ip = getClientIP(request);
  if (!pdfLimiter.check(ip, 10, 60_000)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 2. Body size check
  const contentLength = parseInt(
    request.headers.get("content-length") || "0",
    10
  );
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: "요청 데이터가 너무 큽니다." },
      { status: 413 }
    );
  }

  // 3. Auth
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "시스템 설정 오류입니다." }, { status: 503 });
  }

  const user = await resolveUser(sb.client, request);
  if (!user) {
    return sb.applyCookies(
      NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    );
  }

  // 4. Parse body
  let body: z.infer<typeof requestSchema>;
  try {
    const raw = await request.json();
    body = requestSchema.parse(raw);
  } catch {
    return sb.applyCookies(
      NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      )
    );
  }

  try {
    // 5. Resolve story data
    let title = "새 동화";
    let spreads: { spreadNumber: number; title?: string; text: string }[] = [];
    let metadata: {
      readingGuide?: string;
      illustPrompts?: string;
      nuriMapping?: string;
      devReview?: string;
    } = {};
    let ageGroup = body.ageGroup || "toddler";

    if (body.storyId) {
      // DB에서 조회
      const { data: story, error } = await sb.client
        .from("teacher_stories")
        .select("title, spreads, metadata, brief_context")
        .eq("id", body.storyId)
        .eq("teacher_id", user.id)
        .single();

      if (error || !story) {
        return sb.applyCookies(
          NextResponse.json(
            { error: "동화를 찾을 수 없습니다." },
            { status: 404 }
          )
        );
      }

      title = (story.title as string) || "새 동화";
      spreads = Array.isArray(story.spreads)
        ? (story.spreads as typeof spreads)
        : [];
      metadata = (story.metadata as typeof metadata) || {};

      // brief_context에서 연령 추출
      const briefContext = story.brief_context as Record<string, unknown> | null;
      if (briefContext?.targetAge) {
        ageGroup = briefContext.targetAge as string;
      }
    } else if (body.story) {
      title = body.story.title || "새 동화";
      spreads = body.story.spreads;
      metadata = body.story.metadata || {};
    } else {
      return sb.applyCookies(
        NextResponse.json(
          { error: "storyId 또는 story 데이터가 필요합니다." },
          { status: 400 }
        )
      );
    }

    if (spreads.length === 0) {
      return sb.applyCookies(
        NextResponse.json(
          { error: "스프레드 데이터가 없습니다." },
          { status: 400 }
        )
      );
    }

    // 6. Generate HTML
    let html: string;

    const spreadData = spreads.map((s) => ({
      spreadNumber: s.spreadNumber,
      title: s.title,
      text: s.text,
    }));
    const metaData = {
      readingGuide: metadata.readingGuide,
      illustPrompts: metadata.illustPrompts,
      nuriMapping: metadata.nuriMapping,
      devReview: metadata.devReview,
    };
    const commonParams = { title, spreads: spreadData, metadata: metaData, ageGroup, kindergartenName: body.kindergartenName };

    if (body.type === "free-activity") {
      html = generateFreeActivityHtml(commonParams);
    } else if (body.type === "activity") {
      html = generateActivitySheetHtml(commonParams);
    } else {
      html = generateReadingGuideHtml(commonParams);
    }

    // 7. Return HTML or DOC
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://mamastale-global.pages.dev";

    if (body.format === "doc") {
      // .doc format: same HTML with MS Word mime type
      const safeFilename = encodeURIComponent(title.slice(0, 50) || "활동지");
      return sb.applyCookies(
        new NextResponse(html, {
          headers: {
            "Content-Type": "application/msword",
            "Content-Disposition": `attachment; filename="${safeFilename}.doc"; filename*=UTF-8''${safeFilename}.doc`,
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
          },
        })
      );
    }

    return sb.applyCookies(
      new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src ${siteUrl}`,
        },
      })
    );
  } catch (error) {
    console.error(
      "[Teacher PDF] Generation error:",
      error instanceof Error ? error.name : "Unknown"
    );
    return sb.applyCookies(
      NextResponse.json(
        { error: "PDF 생성에 실패했습니다." },
        { status: 500 }
      )
    );
  }
}
