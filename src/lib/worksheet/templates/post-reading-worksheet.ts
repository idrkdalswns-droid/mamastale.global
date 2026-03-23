/**
 * Post-reading worksheet HTML template.
 * @module worksheet/templates/post-reading-worksheet
 */

import type { PostReadingWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml } from "./worksheet-base";

export function renderPostReadingWorksheet(
  data: PostReadingWorksheetOutput,
  params: DerivedParams
): string {
  const questionsHtml = data.comprehension_questions
    .map(
      (q, i) => `
    <div class="question-item">
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

  const drawingHeight = Math.round(250 * params.drawing_space_ratio);

  const creativeHtml = data.creative_extension
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">더 생각해볼까요?</h3>
      <div class="activity-instruction">${escapeHtml(data.creative_extension)}</div>
      <div class="writing-lines">
        ${Array.from({ length: 3 }, () => '<div class="line"></div>').join("")}
      </div>
    </div>`
    : "";

  const content = `
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="activity-block">
      <h3 class="ws-section-title">이야기를 떠올려봐요</h3>
      ${questionsHtml}
    </div>

    <div class="activity-block">
      <h3 class="ws-section-title">그려보세요</h3>
      <div class="drawing-area-label">${escapeHtml(data.drawing_prompt)}</div>
      <div class="drawing-area" style="min-height: ${drawingHeight}px;"></div>
    </div>

    <div class="activity-block">
      <h3 class="ws-section-title">써보세요</h3>
      <div class="drawing-area-label">${escapeHtml(data.writing_prompt)}</div>
      <div class="writing-lines">
        ${Array.from(
          { length: params.writing_ratio > 0.3 ? 6 : 3 },
          () => '<div class="line"></div>'
        ).join("")}
      </div>
    </div>

    ${creativeHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
