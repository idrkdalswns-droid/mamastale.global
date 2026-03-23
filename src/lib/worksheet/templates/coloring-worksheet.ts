/**
 * Coloring worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/coloring-worksheet
 */

import type { ColoringWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderColoringWorksheet(
  data: ColoringWorksheetOutput,
  params: DerivedParams
): string {
  const scenesHtml = data.coloring_scenes
    .map(
      (scene, i) => `
    <div class="activity-block">
      <h3 style="margin: 0 0 8px 0; color: #E07A5F;">
        ${params.instruction_complexity === "icon_only" ? "🎨" : `🎨 장면 ${i + 1}`}
      </h3>
      <div class="activity-instruction">${escapeHtml(scene.scene_description)}</div>
      <div style="font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt; color: #8B6B57; margin-bottom: 8px;">
        색칠할 것: ${scene.elements.map((e) => escapeHtml(e)).join(", ")}
      </div>
      <div style="font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt; color: #C4A882; margin-bottom: 8px;">
        분위기: ${escapeHtml(scene.mood)}
      </div>
      <div class="drawing-area" style="min-height: ${Math.round(280 * params.drawing_space_ratio)}px;">
        ${params.instruction_complexity === "icon_only" ? "🖍️" : "🖍️ 자유롭게 색칠해보세요!"}
      </div>
    </div>`
    )
    .join("");

  const colorSuggestionHtml = data.color_suggestion
    ? `
    <div class="activity-block" style="border-color: #B8E0D2;">
      <div class="activity-instruction">
        🌈 ${escapeHtml(data.color_suggestion)}
      </div>
    </div>`
    : "";

  const freeDrawingHtml = `
    <div class="activity-block">
      <h3 style="margin: 0 0 8px 0; color: #E07A5F;">✏️ 자유 그리기</h3>
      <div class="activity-instruction">${escapeHtml(data.free_drawing_prompt)}</div>
      <div class="drawing-area" style="min-height: ${Math.round(250 * params.drawing_space_ratio)}px;">
        ${params.instruction_complexity === "icon_only" ? "✏️" : "✏️ 마음껏 그려보세요!"}
      </div>
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
