/**
 * Character card worksheet HTML template.
 * @module worksheet/templates/character-card-worksheet
 */

import type { CharacterCardWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml, getCharacterInitial, INITIAL_CIRCLE_COLORS } from "./worksheet-base";

export function renderCharacterCardWorksheet(
  data: CharacterCardWorksheetOutput,
  params: DerivedParams
): string {
  const cardsHtml = data.characters
    .map(
      (char, ci) => `
    <div class="activity-block">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span class="initial-circle" style="background: ${INITIAL_CIRCLE_COLORS[ci % INITIAL_CIRCLE_COLORS.length]};">${getCharacterInitial(char.name)}</span>
        <div>
          <div style="font-size: ${Math.round(params.font_size_body_pt * 1.1)}pt; font-weight: 700; color: #5A3E2B;">${escapeHtml(char.name)}</div>
          <div style="font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt; color: #8B6B57;">${escapeHtml(char.role)}</div>
        </div>
      </div>

      <div class="drawing-area-label">${escapeHtml(char.drawing_prompt)}</div>
      <div class="drawing-area" style="min-height: ${Math.round(140 * params.drawing_space_ratio)}px;"></div>

      <table class="ws-table" style="margin-top: 10px;">
        <tr><th style="width: 80px;">생김새</th><td>${escapeHtml(char.appearance)}</td></tr>
        <tr><th>성격</th><td>${char.personality.map((p) => escapeHtml(p)).join(", ")}</td></tr>
        <tr><th>좋아하는 것</th><td>${escapeHtml(char.favorite_thing)}</td></tr>
        <tr><th>감정</th><td><span class="ws-badge">${escapeHtml(char.emotion_keyword)}</span></td></tr>
        ${char.relationship ? `<tr><th>관계</th><td>${escapeHtml(char.relationship)}</td></tr>` : ""}
      </table>
    </div>`
    )
    .join("");

  const comparisonHtml = data.comparison_question
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">비교해볼까요?</h3>
      <div class="activity-instruction">${escapeHtml(data.comparison_question)}</div>
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

    ${cardsHtml}
    ${comparisonHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
