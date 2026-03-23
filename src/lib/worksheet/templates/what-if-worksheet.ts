/**
 * What-If worksheet HTML template.
 * @module worksheet/templates/what-if-worksheet
 */

import type { WhatIfWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml } from "./worksheet-base";

export function renderWhatIfWorksheet(
  data: WhatIfWorksheetOutput,
  params: DerivedParams
): string {
  const scenarioHtml = `
    <div class="activity-block">
      <h3 class="ws-section-title">만약에... (${escapeHtml(data.scenario.character)})</h3>
      <div style="font-size: ${params.font_size_body_pt}pt; line-height: 1.8; padding: 10px 14px; background: #FAF6F1; border-radius: 4px; border-left: 3px solid #E07A5F; margin-bottom: 10px;">
        ${escapeHtml(data.scenario.scene_summary)}
      </div>
      <div style="padding: 10px 14px; background: #FAF6F1; border-radius: 4px; font-weight: 500;">
        ${escapeHtml(data.scenario.dilemma)}
      </div>
    </div>`;

  const questionTypeLabel: Record<string, string> = {
    feeling: "감정",
    action: "행동",
    empathy: "공감",
    creative: "상상",
  };

  const questionsHtml = data.perspective_questions
    .map(
      (q, i) => `
    <div class="activity-block">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span class="ws-badge">${questionTypeLabel[q.type] || q.type}</span>
      </div>
      <div class="question-text">${i + 1}. ${escapeHtml(q.question)}</div>
      <div class="writing-lines">
        ${Array.from(
          { length: params.writing_ratio > 0.3 ? 3 : 2 },
          () => '<div class="line"></div>'
        ).join("")}
      </div>
    </div>`
    )
    .join("");

  const drawingHtml = `
    <div class="activity-block">
      <h3 class="ws-section-title">그려볼까요?</h3>
      <div class="drawing-area-label">${escapeHtml(data.drawing_prompt)}</div>
      <div class="drawing-area" style="min-height: ${Math.round(200 * params.drawing_space_ratio)}px;"></div>
    </div>`;

  const myStoryHtml = data.my_story_prompt
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">나의 이야기</h3>
      <div class="drawing-area-label">${escapeHtml(data.my_story_prompt)}</div>
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
