/**
 * What-If worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/what-if-worksheet
 */

import type { WhatIfWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderWhatIfWorksheet(
  data: WhatIfWorksheetOutput,
  params: DerivedParams
): string {
  const scenarioHtml = `
    <div class="activity-block" style="border-color: #FFB5A7; background: #FFF5F2;">
      <h3 style="margin: 0 0 12px 0; color: #E07A5F;">🎭 이런 상황이에요</h3>
      <div style="font-size: ${params.font_size_body_pt}pt; margin-bottom: 12px;">
        <strong>${escapeHtml(data.scenario.character)}</strong>의 이야기:
      </div>
      <div style="font-size: ${params.font_size_body_pt}pt; line-height: 1.8; padding: 12px 16px; background: white; border-radius: 8px; border-left: 4px solid #FFB5A7;">
        ${escapeHtml(data.scenario.scene_summary)}
      </div>
      <div style="margin-top: 12px; padding: 12px 16px; background: #FFF0E8; border-radius: 8px; font-weight: 500;">
        💭 ${escapeHtml(data.scenario.dilemma)}
      </div>
    </div>`;

  const questionTypeLabel: Record<string, string> = {
    feeling: "💗 감정",
    action: "🏃 행동",
    empathy: "🤝 공감",
    creative: "✨ 상상",
  };

  const questionsHtml = data.perspective_questions
    .map(
      (q, i) => `
    <div class="activity-block">
      <div class="question-item">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt; background: #B8E0D2; color: #3D6B5E; padding: 2px 8px; border-radius: 10px;">
            ${questionTypeLabel[q.type] || q.type}
          </span>
        </div>
        <div class="question-text">${i + 1}. ${escapeHtml(q.question)}</div>
      </div>
      <div class="writing-lines">
        ${Array.from(
          { length: params.writing_ratio > 0.3 ? 3 : 2 },
          () => '<div class="line"></div>'
        ).join("")}
      </div>
    </div>`
    )
    .join("");

  const drawingHeight = Math.round(200 * params.drawing_space_ratio);

  const drawingHtml = `
    <div class="activity-block">
      <h3 style="margin: 0 0 12px 0; color: #E07A5F;">🖍️ 내가 ${escapeHtml(data.scenario.character)}라면...</h3>
      <div class="activity-instruction">${escapeHtml(data.drawing_prompt)}</div>
      <div class="drawing-area" style="min-height: ${drawingHeight}px;">
        ${params.instruction_complexity === "icon_only" ? "그려요!" : "내 모습을 자유롭게 그려보세요"}
      </div>
    </div>`;

  const myStoryHtml = data.my_story_prompt
    ? `
    <div class="activity-block" style="border-color: #B8E0D2;">
      <h3 style="margin: 0 0 8px 0; color: #3D6B5E;">📝 나만의 이야기</h3>
      <div class="activity-instruction">${escapeHtml(data.my_story_prompt)}</div>
      <div class="writing-lines">
        ${Array.from({ length: 4 }, () => '<div class="line"></div>').join("")}
      </div>
    </div>`
    : "";

  const content = `
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    ${scenarioHtml}
    ${questionsHtml}
    ${drawingHtml}
    ${myStoryHtml}
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
