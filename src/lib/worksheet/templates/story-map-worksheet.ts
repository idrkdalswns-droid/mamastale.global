/**
 * Story map worksheet HTML template — vertical flow layout.
 * @module worksheet/templates/story-map-worksheet
 */

import type { StoryMapWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml } from "./worksheet-base";

export function renderStoryMapWorksheet(
  data: StoryMapWorksheetOutput,
  params: DerivedParams
): string {
  const phasesHtml = data.phases
    .map(
      (phase, i) => `
    <div class="activity-block" style="display: flex; gap: 12px; align-items: flex-start;">
      <div style="flex-shrink: 0;">
        <span class="ws-number-circle">${i + 1}</span>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: #E07A5F; margin-bottom: 4px;">${escapeHtml(phase.phase_name)}</div>
        <div style="font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt; margin-bottom: 6px;">
          ${escapeHtml(phase.summary)}
        </div>
        <div style="font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt; color: #8B6B57; margin-bottom: 4px;">
          등장: ${phase.characters_involved.map((c) => escapeHtml(c)).join(", ")}
        </div>
        <span class="ws-badge" style="font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;">${escapeHtml(phase.emotion_tone)}</span>
      </div>
      <div style="flex-shrink: 0; width: ${Math.round(120 * params.drawing_space_ratio)}px;">
        <div class="drawing-area" style="min-height: ${Math.round(100 * params.drawing_space_ratio)}px; margin: 0;"></div>
      </div>
    </div>
    ${i < data.phases.length - 1 ? `<div class="ws-arrow">${data.connection_labels?.[i] ? escapeHtml(data.connection_labels[i]) + " " : ""}&#8595;</div>` : ""}`
    )
    .join("");

  const writingHtml =
    params.writing_ratio > 0.2
      ? `
    <div class="activity-block">
      <h3 class="ws-section-title">이야기를 다시 들려줄까요?</h3>
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

    ${phasesHtml}
    ${writingHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
