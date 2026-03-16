/**
 * 선생님 모드 — 읽기 가이드 PDF (HTML 기반)
 *
 * 4페이지 A4 구성:
 *   1p: 표지 + 동화 개요
 *   2p: 읽어주기 가이드 상세
 *   3p: 14스프레드 전문 (텍스트만)
 *   4p: 누리과정 매핑 + 발달 검수
 *
 * @module teacher-reading-guide
 */

import type { TeacherSpread, TeacherStoryMetadata } from "@/lib/types/teacher";

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getActLabel(num: number): string {
  if (num <= 4) return "도입";
  if (num <= 11) return "전개";
  return "결말";
}

function getActColor(num: number): string {
  if (num <= 4) return "#7FBFB0";
  if (num <= 11) return "#E07A5F";
  return "#8B6AAF";
}

const AGE_LABELS: Record<string, string> = {
  infant: "영아반 (0-2세)",
  toddler: "유아반 (3-4세)",
  kindergarten: "유치반 (5-7세)",
  mixed: "혼합연령반",
};

export interface ReadingGuideParams {
  title: string;
  spreads: TeacherSpread[];
  metadata: TeacherStoryMetadata;
  ageGroup?: string;
  kindergartenName?: string;
}

export function generateReadingGuideHtml(params: ReadingGuideParams): string {
  const {
    title,
    spreads,
    metadata,
    ageGroup = "toddler",
    kindergartenName = "",
  } = params;

  const safeTitle = escapeHtml(title || "새 동화");
  const safeKindergarten = escapeHtml(kindergartenName);
  const ageLabel = AGE_LABELS[ageGroup] || "유아반";
  const createdAt = new Date().toLocaleDateString("ko-KR");

  // ─── 1p: 표지 + 개요 ───
  const coverPage = `
  <div class="page cover-page">
    <div class="cover-top">
      <div class="cover-badge">읽어주기 가이드</div>
      <h1 class="cover-title">${safeTitle}</h1>
      <div class="cover-meta">
        ${safeKindergarten ? `<span>${safeKindergarten}</span><span class="dot">·</span>` : ""}
        <span>${escapeHtml(ageLabel)}</span>
        <span class="dot">·</span>
        <span>${spreads.length}스프레드</span>
      </div>
    </div>
    <div class="cover-overview">
      <h2>📖 동화 구조</h2>
      <div class="structure-bar">
        <div class="bar-section intro" style="flex: ${Math.min(4, spreads.filter((s) => s.spreadNumber <= 4).length)}">
          <span>도입</span>
          <small>SP01-04</small>
        </div>
        <div class="bar-section develop" style="flex: ${Math.min(7, spreads.filter((s) => s.spreadNumber >= 5 && s.spreadNumber <= 11).length)}">
          <span>전개</span>
          <small>SP05-11</small>
        </div>
        <div class="bar-section ending" style="flex: ${Math.min(3, spreads.filter((s) => s.spreadNumber >= 12).length)}">
          <span>결말</span>
          <small>SP12-14</small>
        </div>
      </div>
      <div class="spread-list-mini">
        ${spreads.map((s) => `<div class="mini-item"><span class="mini-num" style="color: ${getActColor(s.spreadNumber)}">SP${String(s.spreadNumber).padStart(2, "0")}</span> <span class="mini-title">${escapeHtml(s.title || "")}</span></div>`).join("\n        ")}
      </div>
    </div>
    <div class="cover-footer">${createdAt} · mamastale</div>
  </div>`;

  // ─── 2p: 읽어주기 가이드 상세 ───
  const guidePage = `
  <div class="page guide-page">
    <div class="page-header">
      <span class="page-icon">📋</span>
      <h2>읽어주기 가이드</h2>
    </div>
    ${metadata.readingGuide ? `
    <div class="guide-block">
      <div class="guide-text">${escapeHtml(metadata.readingGuide)}</div>
    </div>` : `
    <div class="guide-block">
      <div class="guide-text">읽어주기 가이드가 생성되지 않았습니다.</div>
    </div>`}
    <div class="guide-tips">
      <h3>💡 일반 읽어주기 팁</h3>
      <div class="tips-grid">
        <div class="tip-card">
          <div class="tip-icon">🎭</div>
          <div class="tip-content">
            <strong>목소리 연기</strong>
            <p>등장인물마다 다른 목소리를 사용하세요. 아이들의 집중도가 높아집니다.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon">⏸️</div>
          <div class="tip-content">
            <strong>멈춤의 기술</strong>
            <p>중요한 장면 전에 잠깐 멈추세요. "다음에 무슨 일이 일어날까?"</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon">👆</div>
          <div class="tip-content">
            <strong>참여 유도</strong>
            <p>반복되는 문구가 나오면 아이들이 함께 말하도록 유도하세요.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🤔</div>
          <div class="tip-content">
            <strong>열린 질문</strong>
            <p>읽기 후 "왜 그랬을까?" "어떤 기분이었을까?" 질문을 던지세요.</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  // ─── 3p: 14스프레드 전문 ───
  const storyPage = `
  <div class="page story-page">
    <div class="page-header">
      <span class="page-icon">📖</span>
      <h2>동화 전문</h2>
    </div>
    <div class="story-spreads">
      ${spreads.map((s) => `
      <div class="story-spread">
        <div class="story-spread-header">
          <span class="story-spread-badge" style="background: ${getActColor(s.spreadNumber)}">${escapeHtml(getActLabel(s.spreadNumber))}</span>
          <span class="story-spread-num">SP${String(s.spreadNumber).padStart(2, "0")}</span>
          <span class="story-spread-title">${escapeHtml(s.title || "")}</span>
        </div>
        <p class="story-spread-text">${escapeHtml(s.text)}</p>
      </div>`).join("\n")}
    </div>
  </div>`;

  // ─── 4p: 누리과정 + 발달 검수 ───
  const reviewPage = `
  <div class="page review-page">
    ${metadata.nuriMapping ? `
    <div class="review-section">
      <div class="page-header">
        <span class="page-icon">🎯</span>
        <h2>누리과정 연계 매핑</h2>
      </div>
      <div class="review-content">${escapeHtml(metadata.nuriMapping)}</div>
    </div>` : ""}
    ${metadata.devReview ? `
    <div class="review-section">
      <div class="page-header">
        <span class="page-icon">✅</span>
        <h2>발달 적합성 검수</h2>
      </div>
      <div class="review-content">${escapeHtml(metadata.devReview)}</div>
    </div>` : ""}
    ${!metadata.nuriMapping && !metadata.devReview ? `
    <div class="review-section">
      <div class="page-header">
        <span class="page-icon">ℹ️</span>
        <h2>부가 자료</h2>
      </div>
      <div class="review-content">부가 자료가 생성되지 않았습니다. 동화를 다시 생성하면 누리과정 연계 매핑과 발달 적합성 검수가 포함됩니다.</div>
    </div>` : ""}
  </div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle} — 읽어주기 가이드</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    @page { size: A4 portrait; margin: 15mm 18mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
      color: #3C1E1E; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      font-size: 13px; line-height: 1.6;
    }

    .page { page-break-after: always; min-height: 100vh; padding: 36px; }
    .page:last-child { page-break-after: auto; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #E07A5F; }
    .page-header h2 { font-size: 1.2rem; font-weight: 700; color: #3C1E1E; }
    .page-icon { font-size: 1.2rem; }

    /* ── 표지 ── */
    .cover-page { display: flex; flex-direction: column; }
    .cover-top { text-align: center; padding: 40px 20px 30px; }
    .cover-badge { display: inline-block; padding: 5px 16px; border-radius: 16px; background: #E07A5F; color: #fff; font-size: 0.8rem; font-weight: 500; margin-bottom: 20px; }
    .cover-title { font-size: 1.6rem; font-weight: 700; color: #3C1E1E; margin-bottom: 12px; word-break: keep-all; }
    .cover-meta { font-size: 0.85rem; color: #8B6F55; }
    .cover-meta .dot { margin: 0 6px; color: #C4956A; }
    .cover-overview { flex: 1; padding: 20px 0; }
    .cover-overview h2 { font-size: 1rem; font-weight: 600; color: #5A3E2B; margin-bottom: 12px; }
    .structure-bar { display: flex; gap: 2px; height: 36px; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
    .bar-section { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: 0.75rem; }
    .bar-section span { font-weight: 600; }
    .bar-section small { font-size: 0.65rem; opacity: 0.8; }
    .bar-section.intro { background: #7FBFB0; }
    .bar-section.develop { background: #E07A5F; }
    .bar-section.ending { background: #8B6AAF; }
    .spread-list-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .mini-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 3px 0; }
    .mini-num { font-weight: 600; font-size: 0.75rem; flex-shrink: 0; }
    .mini-title { color: #5A3E2B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cover-footer { text-align: center; font-size: 0.75rem; color: #C4956A; padding-top: 16px; border-top: 1px solid #E8E0D4; }

    /* ── 가이드 ── */
    .guide-block { margin-bottom: 24px; }
    .guide-text { font-size: 0.88rem; color: #44403c; line-height: 1.8; white-space: pre-line; word-break: keep-all; background: #FAFAF8; padding: 16px; border-radius: 12px; border-left: 3px solid #E07A5F; }
    .guide-tips h3 { font-size: 0.95rem; font-weight: 600; color: #5A3E2B; margin-bottom: 12px; }
    .tips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .tip-card { display: flex; gap: 10px; padding: 12px; background: #F8F6F2; border-radius: 10px; }
    .tip-icon { font-size: 1.3rem; flex-shrink: 0; }
    .tip-content strong { font-size: 0.85rem; color: #5A3E2B; display: block; margin-bottom: 3px; }
    .tip-content p { font-size: 0.8rem; color: #8B6F55; line-height: 1.5; word-break: keep-all; }

    /* ── 동화 전문 ── */
    .story-spreads { display: flex; flex-direction: column; gap: 12px; }
    .story-spread { page-break-inside: avoid; }
    .story-spread-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .story-spread-badge { display: inline-block; padding: 2px 8px; border-radius: 8px; color: #fff; font-size: 0.7rem; font-weight: 500; }
    .story-spread-num { font-size: 0.7rem; color: #C4956A; }
    .story-spread-title { font-size: 0.85rem; font-weight: 600; color: #5A3E2B; }
    .story-spread-text { font-size: 0.85rem; color: #44403c; line-height: 1.8; white-space: pre-line; word-break: keep-all; padding-left: 12px; border-left: 2px solid #E8E0D4; }

    /* ── 검수 ── */
    .review-section { margin-bottom: 28px; }
    .review-content { font-size: 0.88rem; color: #44403c; line-height: 1.8; white-space: pre-line; word-break: keep-all; background: #FAFAF8; padding: 16px; border-radius: 12px; }

    @media print {
      .page { min-height: auto; padding: 0; }
    }
  </style>
</head>
<body>
  ${coverPage}
  ${guidePage}
  ${storyPage}
  ${reviewPage}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}
