/**
 * Vocabulary worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/vocabulary-worksheet
 */

import type { VocabularyWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderVocabularyWorksheet(
  data: VocabularyWorksheetOutput,
  params: DerivedParams
): string {
  const wordCardsHtml = data.words
    .map(
      (w) => `
    <div class="word-card">
      <div class="word-card-header">
        <span class="word-text">${escapeHtml(w.word)}</span>
        <span class="word-category">${escapeHtml(getCategoryLabel(w.category))}</span>
      </div>
      <div class="word-card-body">
        <div style="margin-bottom: 6px;">
          <strong>뜻:</strong> ${escapeHtml(w.meaning)}
        </div>
        <div style="margin-bottom: 6px; font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt; color: #8B6B57;">
          "${escapeHtml(w.example_sentence)}"
        </div>
        <div class="drawing-area" style="min-height: ${Math.round(100 * params.drawing_space_ratio)}px;">
          🖍️ ${escapeHtml(w.drawing_hint)}
        </div>
      </div>
    </div>`
    )
    .join("");

  const puzzleHtml = data.word_puzzle
    ? `
    <div class="activity-block" style="border-color: #B8E0D2;">
      <h3 style="margin: 0 0 12px 0; color: #3D6B5E;">🧩 낱말 퍼즐</h3>
      <div class="activity-instruction">${escapeHtml(data.word_puzzle.question)}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0;">
        ${data.word_puzzle.items
          .map(
            (item) => `
          <div style="padding: 8px 14px; border: 1.5px solid #E8D5C4; border-radius: 8px; background: #FAFAF5; font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;">
            ${escapeHtml(item)}
          </div>`
          )
          .join("")}
      </div>
      <div class="writing-lines">
        ${Array.from({ length: 2 }, () => '<div class="line"></div>').join("")}
      </div>
    </div>`
    : "";

  const writingPracticeHtml = data.writing_practice_word
    ? `
    <div class="activity-block">
      <h3 style="margin: 0 0 8px 0; color: #E07A5F;">✏️ 써보기 연습</h3>
      <div style="text-align: center; font-size: ${Math.round(params.font_size_title_pt * 0.8)}pt; font-weight: 700; color: #C4A882; margin: 12px 0; letter-spacing: 8px;">
        ${escapeHtml(data.writing_practice_word)}
      </div>
      <div class="writing-lines">
        ${Array.from(
          { length: params.writing_ratio > 0.3 ? 4 : 2 },
          () => '<div class="line"></div>'
        ).join("")}
      </div>
    </div>`
    : "";

  const content = `
    <style>
      .word-card-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .word-card {
        break-inside: avoid;
        border: ${params.line_thickness_mm}mm solid #E8D5C4;
        border-radius: 12px;
        overflow: hidden;
        background: white;
      }
      .word-card-header {
        background: #FFF0E8;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .word-text {
        font-size: ${Math.round(params.font_size_body_pt * 1.1)}pt;
        font-weight: 700;
        color: #E07A5F;
      }
      .word-category {
        font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;
        color: #8B6B57;
        background: #B8E0D2;
        padding: 2px 8px;
        border-radius: 8px;
      }
      .word-card-body {
        padding: 10px 12px;
        font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
      }
      @media print {
        .word-card-grid { grid-template-columns: repeat(2, 1fr); }
      }
    </style>

    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="word-card-grid">
      ${wordCardsHtml}
    </div>

    ${puzzleHtml}
    ${writingPracticeHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}

function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    emotion_word: "감정",
    action_word: "동작",
    noun: "이름",
    adjective: "꾸미는 말",
    onomatopoeia: "소리/모양",
  };
  return map[category] || category;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
