/**
 * Vocabulary worksheet HTML template.
 * @module worksheet/templates/vocabulary-worksheet
 */

import type { VocabularyWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml } from "./worksheet-base";

export function renderVocabularyWorksheet(
  data: VocabularyWorksheetOutput,
  params: DerivedParams
): string {
  const categoryLabel: Record<string, string> = {
    emotion_word: "감정",
    action_word: "동작",
    noun: "이름",
    adjective: "꾸미는 말",
    onomatopoeia: "소리/모양",
  };

  // Age 3: card layout, Age 4-5: table layout
  const isTableLayout = params.vocabulary_level > 1200;

  const wordsHtml = isTableLayout
    ? `
    <table class="ws-table">
      <thead>
        <tr>
          <th>낱말</th>
          <th>종류</th>
          <th>뜻</th>
          <th>예문</th>
        </tr>
      </thead>
      <tbody>
        ${data.words
          .map(
            (w) => `
        <tr>
          <td style="font-weight: 600; color: #E07A5F;">${escapeHtml(w.word)}</td>
          <td><span class="ws-badge">${escapeHtml(categoryLabel[w.category] || w.category)}</span></td>
          <td>${escapeHtml(w.meaning)}</td>
          <td style="color: #8B6B57; font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;">${escapeHtml(w.example_sentence)}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${data.words
      .map(
        (w) => `
    <div class="activity-block">
      <div style="font-weight: 600; color: #E07A5F; margin-bottom: 4px;">${escapeHtml(w.word)}</div>
      <div class="drawing-area-label">${escapeHtml(w.drawing_hint)}</div>
      <div class="drawing-area" style="min-height: ${Math.round(100 * params.drawing_space_ratio)}px;"></div>
    </div>`
      )
      .join("")}`
    : data.words
        .map(
          (w) => `
    <div class="activity-block">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: ${Math.round(params.font_size_body_pt * 1.1)}pt; font-weight: 600; color: #E07A5F;">${escapeHtml(w.word)}</span>
        <span class="ws-badge">${escapeHtml(categoryLabel[w.category] || w.category)}</span>
      </div>
      <div style="margin-bottom: 4px;">${escapeHtml(w.meaning)}</div>
      <div style="font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt; color: #8B6B57; margin-bottom: 8px;">${escapeHtml(w.example_sentence)}</div>
      <div class="drawing-area-label">${escapeHtml(w.drawing_hint)}</div>
      <div class="drawing-area" style="min-height: ${Math.round(140 * params.drawing_space_ratio)}px;"></div>
    </div>`
        )
        .join("");

  const puzzleHtml = data.word_puzzle
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">낱말 퍼즐</h3>
      <div class="activity-instruction">${escapeHtml(data.word_puzzle.question)}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0;">
        ${data.word_puzzle.items
          .map(
            (item) => `<span class="ws-badge">${escapeHtml(item)}</span>`
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
      <h3 class="ws-section-title">써보기 연습</h3>
      <div style="text-align: center; font-size: ${Math.round(params.font_size_title_pt * 0.8)}pt; font-weight: 700; color: #B0A090; margin: 12px 0; letter-spacing: 8px;">
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
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    ${wordsHtml}
    ${puzzleHtml}
    ${writingPracticeHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
