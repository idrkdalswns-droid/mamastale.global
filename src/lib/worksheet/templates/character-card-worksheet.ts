/**
 * Character card worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/character-card-worksheet
 */

import type { CharacterCardWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderCharacterCardWorksheet(
  data: CharacterCardWorksheetOutput,
  params: DerivedParams
): string {
  const cardsHtml = data.characters
    .map(
      (char) => `
    <div class="character-card">
      <div class="character-card-header">
        <div class="character-name">${escapeHtml(char.name)}</div>
        <div class="character-role">${escapeHtml(char.role)}</div>
      </div>
      <div class="character-card-body">
        <div class="drawing-area" style="min-height: ${Math.round(160 * params.drawing_space_ratio)}px;">
          🖍️ ${escapeHtml(char.drawing_prompt)}
        </div>
        <div class="character-info">
          <div class="info-row">
            <span class="info-label">생김새</span>
            <span class="info-value">${escapeHtml(char.appearance)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">성격</span>
            <span class="info-value">${char.personality.map((p) => escapeHtml(p)).join(", ")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">좋아하는 것</span>
            <span class="info-value">${escapeHtml(char.favorite_thing)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">감정</span>
            <span class="info-value emotion-badge">${escapeHtml(char.emotion_keyword)}</span>
          </div>
          ${char.relationship ? `
          <div class="info-row">
            <span class="info-label">관계</span>
            <span class="info-value">${escapeHtml(char.relationship)}</span>
          </div>` : ""}
        </div>
      </div>
    </div>`
    )
    .join("");

  const comparisonHtml = data.comparison_question
    ? `
    <div class="activity-block" style="border-color: #B8E0D2;">
      <h3 style="margin: 0 0 8px 0; color: #3D6B5E;">🤔 비교해볼까요?</h3>
      <div class="activity-instruction">${escapeHtml(data.comparison_question)}</div>
      <div class="writing-lines">
        ${Array.from(
          { length: params.writing_ratio > 0.3 ? 4 : 2 },
          () => '<div class="line"></div>'
        ).join("")}
      </div>
    </div>`
    : "";

  const gridCols = data.characters.length <= 2 ? data.characters.length : 2;

  const content = `
    <style>
      .character-card-grid {
        display: grid;
        grid-template-columns: repeat(${gridCols}, 1fr);
        gap: 16px;
        margin-bottom: 20px;
      }
      .character-card {
        break-inside: avoid;
        border: ${params.line_thickness_mm}mm solid #E8D5C4;
        border-radius: 12px;
        overflow: hidden;
        background: white;
      }
      .character-card-header {
        background: linear-gradient(135deg, #FFB5A7, #FFDAC6);
        padding: 10px 14px;
        text-align: center;
      }
      .character-name {
        font-size: ${Math.round(params.font_size_body_pt * 1.15)}pt;
        font-weight: 700;
        color: #5A3E2B;
      }
      .character-role {
        font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
        color: #8B6B57;
      }
      .character-card-body {
        padding: 12px;
      }
      .character-info {
        margin-top: 8px;
      }
      .info-row {
        display: flex;
        gap: 8px;
        margin-bottom: 6px;
        font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
        align-items: baseline;
      }
      .info-label {
        flex-shrink: 0;
        font-weight: 500;
        color: #E07A5F;
        min-width: 60px;
      }
      .info-value {
        color: #5A3E2B;
      }
      .emotion-badge {
        display: inline-block;
        background: #B8E0D2;
        color: #3D6B5E;
        padding: 2px 8px;
        border-radius: 8px;
        font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
      }
      @media print {
        .character-card-grid { grid-template-columns: repeat(${gridCols}, 1fr); }
      }
    </style>

    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="character-card-grid">
      ${cardsHtml}
    </div>

    ${comparisonHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
