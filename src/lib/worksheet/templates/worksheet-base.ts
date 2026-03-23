/**
 * Base A4 HTML layout for worksheets.
 * Extends teacher-pdf-utils.ts pattern — template literal, Edge Runtime compatible.
 *
 * @module worksheet/templates/worksheet-base
 */

import type { DerivedParams } from "../types";

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
      color: #4A4A4A;
      background: #FFF8F0;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .worksheet-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px dashed #FFB5A7;
    }
    .worksheet-title {
      font-size: ${params.font_size_title_pt}pt;
      font-weight: 700;
      color: #E07A5F;
      margin: 0 0 8px 0;
    }
    .worksheet-subtitle {
      font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
      color: #8B6B57;
      margin: 0;
    }
    .nuri-badge {
      display: inline-block;
      background: #B8E0D2;
      color: #3D6B5E;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
      font-weight: 500;
      margin-top: 8px;
    }
    .activity-block {
      break-inside: avoid;
      margin-bottom: 20px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      border: ${params.line_thickness_mm}mm solid #E8D5C4;
    }
    .activity-instruction {
      font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
      color: #8B6B57;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #FFF0E8;
      border-radius: 8px;
    }
    .drawing-area {
      min-height: ${Math.round(200 * params.drawing_space_ratio)}px;
      border: 2px dashed #C4A882;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #C4A882;
      font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
      margin: 12px 0;
    }
    .writing-area {
      min-height: 80px;
      border-bottom: 1.5px solid #D4C4B0;
      margin: 8px 0;
      padding: 4px 0;
    }
    .writing-lines .line {
      border-bottom: 1px solid #E8D5C4;
      height: ${Math.round(params.font_size_body_pt * 2)}px;
      margin-bottom: 4px;
    }
    .emotion-icon-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 12px 0;
    }
    .emotion-icon-item {
      text-align: center;
      padding: 8px;
      border: 1.5px solid #E8D5C4;
      border-radius: 8px;
      font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
    }
    .question-item {
      margin-bottom: 16px;
      padding: 12px;
      background: #FAFAF5;
      border-radius: 8px;
      border-left: 4px solid #FFB5A7;
    }
    .question-text {
      font-weight: 500;
      margin-bottom: 8px;
    }
    .worksheet-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #E8D5C4;
      font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;
      color: #C4A882;
    }
    .name-field {
      display: inline-block;
      border-bottom: 1.5px solid #C4A882;
      min-width: 100px;
      margin: 0 4px;
    }
    @media print {
      body { background: white; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="worksheet-header">
    <h1 class="worksheet-title">${escapeHtml(meta.title)}</h1>
    <p class="worksheet-subtitle">${escapeHtml(meta.subtitle)}</p>
    <span class="nuri-badge">누리과정: ${escapeHtml(meta.nuri_domain)}</span>
  </div>

  <div style="margin-bottom: 16px; font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;">
    이름: <span class="name-field">&nbsp;</span> &nbsp; 날짜: <span class="name-field">&nbsp;</span>
  </div>

  ${content}

  <div class="worksheet-footer">
    마마스테일 · 엄마엄마동화 · mamastale.com
  </div>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
