import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIP } from "@/lib/utils/validation";
import { createApiSupabaseClient } from "@/lib/supabase/server-api";

export const runtime = "edge";

// Rate limiting for PDF generation
const pdfRateMap = new Map<string, { count: number; resetAt: number }>();
function checkPdfRateLimit(ip: string): boolean {
  const now = Date.now();
  if (pdfRateMap.size > 300) {
    for (const [k, v] of pdfRateMap) { if (now > v.resetAt) pdfRateMap.delete(k); }
  }
  const entry = pdfRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    pdfRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false; // 10 per minute
  entry.count++;
  return true;
}

/** Decode pre-encoded HTML entities — loops to handle multi-level encoding */
function decodeHtmlEntities(text: string): string {
  let result = text;
  let prev = "";
  let iter = 0;
  while (prev !== result && iter < 10) {
    prev = result;
    iter++;
    result = result
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#0?39;/g, "'");
  }
  return result;
}

/** Strip markdown artifacts from scene text for PDF */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+?)`/g, "$1")
    .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Escape HTML special characters to prevent XSS in generated HTML */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Safely prepare text for HTML: decode → strip markdown → escape */
function safeHtml(text: string): string {
  return escapeHtml(stripMarkdown(decodeHtmlEntities(text)));
}

// LAUNCH-FIX: Add max lengths to prevent memory exhaustion / DoS
const MAX_PDF_BODY_SIZE = 512_000;
const pdfRequestSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      title: z.string().max(500),
      text: z.string().max(10_000),
      imagePrompt: z.string().max(1000).optional(),
    })
  ).max(20),
  title: z.string().max(200).optional(),
  authorName: z.string().max(100).optional(),
  coverImage: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  if (!checkPdfRateLimit(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  // LAUNCH-FIX: Reject oversized bodies before parsing
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_PDF_BODY_SIZE) {
    return NextResponse.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
  }

  // IL-01: Proper Supabase session validation (not just cookie existence)
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  // CTO-FIX: Bearer token fallback for mobile/WebView compatibility
  let user = (await sb.client.auth.getUser()).data.user;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
      user = tokenData.user;
    }
  }
  if (!user) {
    return sb.applyCookies(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  try {
    // CA-10: Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return sb.applyCookies(NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 }));
    }
    const parsed = pdfRequestSchema.safeParse(body);

    if (!parsed.success) {
      return sb.applyCookies(NextResponse.json(
        { error: "Invalid story data" },
        { status: 400 }
      ));
    }

    const { scenes, title, authorName, coverImage } = parsed.data;
    const storyTitle = escapeHtml(title || "나의 마음 동화");
    const author = escapeHtml(authorName || "어머니");
    const createdAt = new Date().toLocaleDateString("ko-KR");

    // Validate cover image path (whitelist)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mamastale-global.pages.dev";
    const hasCover = coverImage && /^\/images\/covers\/cover_(pink|green|blue)\d{2}\.(png|jpeg)$/.test(coverImage);
    // R4-C1: Escape coverUrl to prevent XSS via env misconfiguration
    const coverUrl = hasCover ? escapeHtml(`${siteUrl}${coverImage}`) : "";

    // Generate printable HTML — cover + scene-by-scene story + ending page
    const sceneHtml = scenes.map((scene, idx) => {
      const sceneTitle = escapeHtml(scene.title || `장면 ${scene.sceneNumber}`);
      return `
    <section class="scene">
      <div class="scene-header">
        <span class="scene-num">${idx + 1}</span>
        <h3 class="scene-title">${sceneTitle}</h3>
      </div>
      <p class="scene-text">${safeHtml(scene.text)}</p>
    </section>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${storyTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;700&display=swap');
    @page { margin: 20mm 25mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Serif KR', 'Batang', serif; color: #3C1E1E; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* ── Cover page ── */
    .cover {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; text-align: center; padding: 60px 40px;
      background: linear-gradient(160deg, #FBF5EC 0%, #F8EDE0 40%, #F2DFCE 100%);
      position: relative; overflow: hidden;
    }
    .cover.has-image {
      background-size: cover; background-position: center; background-repeat: no-repeat;
    }
    .cover.has-image::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.08) 100%);
    }
    .cover:not(.has-image)::before {
      content: ''; position: absolute; top: -60px; right: -60px;
      width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, rgba(224,122,95,0.10) 0%, transparent 70%);
    }
    .cover:not(.has-image)::after {
      content: ''; position: absolute; bottom: -40px; left: -40px;
      width: 160px; height: 160px; border-radius: 50%;
      background: radial-gradient(circle, rgba(196,149,106,0.08) 0%, transparent 70%);
    }
    .cover-brand { font-size: 0.85rem; letter-spacing: 3px; color: #C4956A; font-weight: 300; margin-bottom: 40px; text-transform: uppercase; position: relative; z-index: 1; }
    .cover-line { width: 48px; height: 1.5px; background: #E07A5F; margin: 0 auto 32px; border-radius: 1px; position: relative; z-index: 1; }
    .cover h1 { font-size: 2.2rem; color: #3C1E1E; font-weight: 700; margin-bottom: 16px; line-height: 1.4; letter-spacing: -0.02em; position: relative; z-index: 1; }
    .cover .author { font-size: 1rem; color: #8B6F55; font-weight: 300; position: relative; z-index: 1; }
    .cover .date { font-size: 0.8rem; color: #C4956A; margin-top: 8px; font-weight: 300; position: relative; z-index: 1; }
    .cover-footer { position: absolute; bottom: 40px; font-size: 0.7rem; color: #C4956A; font-weight: 300; letter-spacing: 1px; z-index: 1; }
    /* Image cover overrides — white text on dark overlay */
    .cover.has-image .cover-brand { color: rgba(255,255,255,0.7); }
    .cover.has-image .cover-line { background: rgba(255,255,255,0.5); }
    .cover.has-image h1 { color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .cover.has-image .author { color: rgba(255,255,255,0.85); }
    .cover.has-image .date { color: rgba(255,255,255,0.6); }
    .cover.has-image .cover-footer { color: rgba(255,255,255,0.4); }

    /* ── Story content ── */
    .story-body { padding: 48px 40px; page-break-before: always; }
    .scene { page-break-inside: avoid; margin-bottom: 40px; }
    .scene:last-of-type { margin-bottom: 0; }
    .scene-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .scene-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: rgba(224,122,95,0.10); color: #E07A5F;
      font-size: 0.75rem; font-weight: 700;
    }
    .scene-title { font-size: 1rem; color: #8B6F55; font-weight: 400; letter-spacing: -0.01em; }
    .scene-text { font-size: 1.05rem; line-height: 2.4; color: #44403c; white-space: pre-wrap; text-indent: 1em; font-weight: 300; }

    /* ── Ending page ── */
    .ending {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 60vh; text-align: center; padding: 60px 40px;
      page-break-before: always;
    }
    .ending-line { width: 48px; height: 1.5px; background: #E07A5F; margin: 0 auto 28px; border-radius: 1px; }
    .ending-msg { font-size: 1rem; color: #8B6F55; font-weight: 300; line-height: 2.2; margin-bottom: 32px; }
    .ending-brand { font-size: 0.75rem; color: #C4956A; font-weight: 300; letter-spacing: 2px; }
    .ending-sub { font-size: 0.7rem; color: #C4956A; font-weight: 300; margin-top: 6px; }

    @media print {
      .cover { min-height: auto; padding: 80px 40px; }
      .ending { min-height: auto; padding: 80px 40px; }
    }
  </style>
</head>
<body>
  <div class="cover${hasCover ? " has-image" : ""}"${hasCover ? ` style="background-image: url('${coverUrl}')"` : ""}>
    <div class="cover-brand">mamastale</div>
    <div class="cover-line"></div>
    <h1>${storyTitle}</h1>
    <div class="author">${author}</div>
    <div class="date">${createdAt}</div>
    <div class="cover-footer">mamastale.com</div>
  </div>
  <div class="story-body">
${sceneHtml}
  </div>
  <div class="ending">
    <div class="ending-line"></div>
    <p class="ending-msg">
      이 동화는 ${author}의<br>마음에서 태어난 이야기입니다.
    </p>
    <div class="ending-brand">mamastale</div>
    <p class="ending-sub">세상에 하나뿐인 마음 동화</p>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    // JP-14: Return with security headers
    return sb.applyCookies(new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src ${siteUrl}`,
      },
    }));
  } catch (error) {
    console.error("PDF generation error:", error instanceof Error ? error.name : "Unknown");
    return sb.applyCookies(NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    ));
  }
}
