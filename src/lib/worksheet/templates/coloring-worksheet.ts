/**
 * Coloring worksheet HTML template.
 * @module worksheet/templates/coloring-worksheet
 */

import type { ColoringWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml } from "./worksheet-base";

export function renderColoringWorksheet(
  data: ColoringWorksheetOutput,
  params: DerivedParams
): string {
  const scenesHtml = data.coloring_scenes
    .map(
      (scene, i) => `
    <div class="activity-block">
      <h3 class="ws-section-title">장면 ${i + 1}</h3>
      <div class="activity-instruction">${escapeHtml(scene.scene_description)}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
        ${scene.elements.map((e) => `<span class="ws-badge">${escapeHtml(e)}</span>`).join("")}
      </div>
      <div class="drawing-area" style="min-height: ${Math.round(350 * params.drawing_space_ratio)}px;"></div>
    </div>`
    )
    .join("");

  const colorSuggestionHtml = data.color_suggestion
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">색칠 팁</h3>
      <div class="activity-instruction">${escapeHtml(data.color_suggestion)}</div>
    </div>`
    : "";

  const freeDrawingHtml = `
    <div class="activity-block">
      <h3 class="ws-section-title">자유 그리기</h3>
      <div class="drawing-area-label">${escapeHtml(data.free_drawing_prompt)}</div>
      <div class="drawing-area" style="min-height: ${Math.round(300 * params.drawing_space_ratio)}px;"></div>
    </div>`;

  const content = `
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    ${scenesHtml}
    ${colorSuggestionHtml}
    ${freeDrawingHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
