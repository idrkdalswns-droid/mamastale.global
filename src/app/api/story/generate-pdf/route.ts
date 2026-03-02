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

/** Decode pre-encoded HTML entities (prevents double-escaping) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
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

/** Safely prepare text for HTML: decode first, then escape (prevents double-encoding) */
function safeHtml(text: string): string {
  return escapeHtml(decodeHtmlEntities(text));
}

const pdfRequestSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      title: z.string(),
      text: z.string(),
      imagePrompt: z.string().optional(),
    })
  ),
  title: z.string().optional(),
  authorName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  if (!checkPdfRateLimit(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  // IL-01: Proper Supabase session validation (not just cookie existence)
  const sb = createApiSupabaseClient(request);
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const { data: { user } } = await sb.client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    // CA-10: Safe JSON parsing
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }
    const parsed = pdfRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid story data" },
        { status: 400 }
      );
    }

    const { scenes, title, authorName } = parsed.data;
    const storyTitle = escapeHtml(title || "나의 마음 동화");
    const author = escapeHtml(authorName || "어머니");
    const createdAt = new Date().toLocaleDateString("ko-KR");

    // Generate printable HTML — 2 pages: cover + all story text
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${storyTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Serif KR', serif; color: #333; background: #fff; }
    .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 40px; background: linear-gradient(135deg, #fef3c7, #fde68a, #fbbf24); }
    .cover h1 { font-size: 2.5rem; color: #92400e; margin-bottom: 16px; }
    .cover .author { font-size: 1.2rem; color: #a16207; }
    .cover .date { font-size: 0.9rem; color: #b45309; margin-top: 8px; }
    .cover .emoji { font-size: 4rem; margin-bottom: 24px; }
    .story-content { padding: 40px; page-break-before: always; }
    .story-content h2 { font-size: 1.6rem; color: #92400e; margin-bottom: 28px; text-align: center; border-bottom: 2px solid #fbbf24; padding-bottom: 12px; }
    .story-content p { font-size: 1.1rem; line-height: 2.2; color: #44403c; white-space: pre-wrap; margin-bottom: 20px; text-indent: 1em; }
    .story-content p:last-of-type { margin-bottom: 0; }
    .footer { text-align: center; padding: 40px; color: #a8a29e; font-size: 0.85rem; margin-top: 40px; border-top: 1px solid #e5e0da; }
    @media print { .cover { min-height: auto; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <div class="emoji">📖✨</div>
    <h1>${storyTitle}</h1>
    <div class="author">글 · ${author}</div>
    <div class="date">${createdAt}</div>
  </div>
  <div class="story-content">
    <h2>${storyTitle}</h2>
    ${scenes.map((scene) => `<p>${safeHtml(scene.text)}</p>`).join("\n    ")}
    <div class="footer">
      <p>mamastale · 엄마의 마음 동화</p>
      <p>이 동화는 AI와 함께 만든 특별한 이야기입니다.</p>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    // JP-14: Return with security headers
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
