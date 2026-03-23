/**
 * Emotion worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/emotion-worksheet
 */

import type { EmotionWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml } from "./worksheet-base";

export function renderEmotionWorksheet(
  data: EmotionWorksheetOutput,
  params: DerivedParams
): string {
  const emotionIconsHtml = data.emotion_icons
    .map(
      (icon) => `
    <div class="emotion-icon-item">
      <div class="ws-badge">${escapeHtml(icon.label)}</div>
    </div>`
    )
    .join("");

  const drawingHeight = data.emotion_scenes.length <= 3
    ? Math.round(180 * params.drawing_space_ratio)
    : Math.round(120 * params.drawing_space_ratio);

  const scenesHtml = data.emotion_scenes
    .map(
      (scene, i) => `
    <div class="activity-block">
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="flex: 1;">
          <div class="question-text">${i + 1}. ${escapeHtml(scene.question)}</div>
          <div style="font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt; color: #8B6B57;">
            (${escapeHtml(scene.character)}: ${escapeHtml(scene.scene_summary)})
          </div>
        </div>
        <div style="flex-shrink: 0; width: ${drawingHeight}px; height: ${drawingHeight}px; border: 1px solid #D0D0D0; border-radius: 50%;"></div>
      </div>
      ${params.writing_ratio > 0.2 ? `
      <div class="writing-lines" style="margin-top: 8px;">
        ${Array.from({ length: 2 }, () => '<div class="line"></div>').join("")}
      </div>` : ""}
    </div>`
    )
    .join("");

  const bodyMappingHtml = data.body_mapping_prompt
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">몸으로 느끼는 감정</h3>
      <div class="activity-instruction">${escapeHtml(data.body_mapping_prompt)}</div>
      <div class="drawing-area" style="min-height: 180px;"></div>
    </div>`
    : "";

  // Add free drawing section for sparse content (age 3)
  const freeDrawingHtml = data.emotion_scenes.length <= 2
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">자유롭게 그려보세요</h3>
      <div class="drawing-area-label">오늘 내 기분을 그림으로 표현해 보세요.</div>
      <div class="drawing-area" style="min-height: ${Math.round(250 * params.drawing_space_ratio)}px;"></div>
    </div>`
    : "";

  const content = `
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="activity-block">
      <h3 class="ws-section-title">감정 아이콘</h3>
      <div class="emotion-icon-grid">
        ${emotionIconsHtml}
      </div>
    </div>

    ${scenesHtml}
    ${bodyMappingHtml}
    ${freeDrawingHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
