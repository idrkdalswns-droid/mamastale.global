/**
 * Base A4 HTML layout for worksheets.
 * Extends teacher-pdf-utils.ts pattern — template literal, Edge Runtime compatible.
 *
 * @module worksheet/templates/worksheet-base
 */

import type { DerivedParams } from "../types";

/** Color palette for initial circles — assigned by character index */
export const INITIAL_CIRCLE_COLORS = [
  "#E07A5F",
  "#7FBFB0",
  "#8B6AAF",
  "#C4956A",
  "#5A8FA8",
];

/** Get character initial letter for display */
export function getCharacterInitial(name: string): string {
  return name[0] || "?";
}

/** Shared HTML escape — import this instead of defining locally */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Wrap worksheet content in full HTML document with print styles */
export function worksheetBaseHtml(
  content: string,
  params: DerivedParams,
  meta: { title: string; subtitle: string; nuri_domain: string }
): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
      font-size: ${params.font_size_body_pt}pt;
      color: #5A3E2B;
      background: #FFF8F0;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .worksheet-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #E0E0E0;
    }
    .worksheet-title {
      font-size: ${params.font_size_title_pt}pt;
      font-weight: 700;
      color: #E07A5F;
      margin: 0 0 6px 0;
    }
    .worksheet-subtitle {
      font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
      color: #8B6B57;
      margin: 0;
    }
    .nuri-badge {
      display: inline-block;
      background: #E8F5F0;
      color: #3D6B5E;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;
      font-weight: 500;
      margin-top: 6px;
    }
    .activity-block {
      break-inside: avoid;
      margin-bottom: 16px;
      padding: 14px;
      background: white;
      border-radius: 6px;
      border: 1px solid #E0E0E0;
    }
    .activity-instruction {
      font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
      color: #8B6B57;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #FAF6F1;
      border-radius: 4px;
      border-left: 3px solid #E07A5F;
    }
    .drawing-area {
      min-height: ${Math.round(200 * params.drawing_space_ratio)}px;
      border: 1px solid #D0D0D0;
      border-radius: 4px;
      margin: 12px 0;
    }
    .drawing-area-label {
      font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
      color: #8B6B57;
      margin-bottom: 4px;
      font-style: italic;
    }
    .writing-area {
      min-height: 80px;
      border-bottom: 1px solid #D0D0D0;
      margin: 8px 0;
      padding: 4px 0;
    }
    .writing-lines .line {
      border-bottom: 1px solid #E0E0E0;
      height: ${Math.round(params.font_size_body_pt * 2.2)}px;
      margin-bottom: 4px;
    }
    .emotion-icon-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 12px 0;
    }
    .emotion-icon-item {
      text-align: center;
      padding: 6px;
      border: 1px solid #E0E0E0;
      border-radius: 4px;
      font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
    }
    .question-item {
      margin-bottom: 14px;
      padding: 10px 12px;
      background: #FAFAF5;
      border-radius: 4px;
      border-left: 3px solid #E07A5F;
    }
    .question-text {
      font-weight: 500;
      margin-bottom: 8px;
    }
    .worksheet-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #E0E0E0;
      font-size: ${Math.round(params.font_size_body_pt * 0.65)}pt;
      color: #B0A090;
    }
    .name-field {
      display: inline-block;
      border-bottom: 1px solid #B0A090;
      min-width: 100px;
      margin: 0 4px;
    }
    /* ── Shared utility classes ── */
    .initial-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14pt;
      flex-shrink: 0;
    }
    .ws-badge {
      display: inline-block;
      padding: 3px 10px;
      border: 1px solid #D0D0D0;
      border-radius: 10px;
      font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
      color: #5A3E2B;
      background: #FAF6F1;
    }
    .ws-section-title {
      font-size: ${Math.round(params.font_size_body_pt * 1.05)}pt;
      font-weight: 600;
      color: #E07A5F;
      margin: 0 0 10px 0;
    }
    .ws-number-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #E07A5F;
      color: white;
      font-weight: 700;
      font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
      flex-shrink: 0;
    }
    .ws-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
    }
    .ws-table th {
      background: #FAF6F1;
      padding: 6px 10px;
      text-align: left;
      font-weight: 500;
      font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
      color: #8B6B57;
      border-bottom: 1px solid #E0E0E0;
    }
    .ws-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #F0F0F0;
      font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
    }
    .ws-arrow {
      text-align: center;
      color: #D0D0D0;
      font-size: 16pt;
      margin: 4px 0;
    }
    @media print {
      body { background: white; padding: 0; }
      .activity-block { break-inside: avoid; }
      .drawing-area { break-inside: avoid; }
      .no-print { display: none; }
      p, h3 { orphans: 2; widows: 2; }
    }
  </style>
</head>
<body>
  <div class="worksheet-header">
    <div style="font-size: ${Math.round(params.font_size_body_pt * 0.6)}pt; color: #B0A090; margin-bottom: 4px;">마마스테일 활동지</div>
    <h1 class="worksheet-title">${escapeHtml(meta.title)}</h1>
    <p class="worksheet-subtitle">${escapeHtml(meta.subtitle)}</p>
    <span class="nuri-badge">누리과정: ${escapeHtml(meta.nuri_domain)}</span>
  </div>

  <div style="margin-bottom: 14px; font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;">
    이름: <span class="name-field">&nbsp;</span> &nbsp; 날짜: <span class="name-field">&nbsp;</span>
  </div>

  ${content}

  <div class="worksheet-footer">
    마마스테일 · 엄마엄마동화 · mamastale.com
  </div>
</body>
</html>`;
}
