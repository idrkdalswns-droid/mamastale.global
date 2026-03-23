/**
 * Story map worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/story-map-worksheet
 */

import type { StoryMapWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderStoryMapWorksheet(
  data: StoryMapWorksheetOutput,
  params: DerivedParams
): string {
  const phasesHtml = data.phases
    .map(
      (phase, i) => `
    <div class="storymap-phase">
      <div class="phase-header">
        <div class="phase-number">${i + 1}</div>
        <div class="phase-name">${escapeHtml(phase.phase_name)}</div>
      </div>
      <div class="phase-body">
        <div style="font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt; color: #5A3E2B; margin-bottom: 8px;">
          ${escapeHtml(phase.summary)}
        </div>
        <div style="font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt; color: #8B6B57; margin-bottom: 6px;">
          등장: ${phase.characters_involved.map((c) => escapeHtml(c)).join(", ")}
        </div>
        <div class="drawing-area" style="min-height: ${Math.round(140 * params.drawing_space_ratio)}px;">
          🖍️ ${escapeHtml(phase.drawing_prompt)}
        </div>
        <div class="phase-emotion">${escapeHtml(phase.emotion_tone)}</div>
      </div>
    </div>${
      i < data.phases.length - 1
        ? `<div class="storymap-arrow">
            <span class="arrow-label">${
              data.connection_labels && data.connection_labels[i]
                ? escapeHtml(data.connection_labels[i])
                : "→"
            }</span>
            <span class="arrow-icon">→</span>
          </div>`
        : ""
    }`
    )
    .join("");

  const writingHtml =
    params.writing_ratio > 0.2
      ? `
    <div class="activity-block">
      <h3 style="margin: 0 0 8px 0; color: #E07A5F;">✏️ 이야기를 다시 들려줄까요?</h3>
      <div class="writing-lines">
        ${Array.from(
          { length: params.writing_ratio > 0.3 ? 4 : 2 },
          () => '<div class="line"></div>'
        ).join("")}
      </div>
    </div>`
      : "";

  const content = `
    <style>
      .storymap-container {
        display: grid;
        grid-template-columns: ${data.phases
          .map((_, i) =>
            i < data.phases.length - 1 ? "1fr auto" : "1fr"
          )
          .join(" ")};
        gap: 0;
        align-items: stretch;
        margin-bottom: 20px;
      }
      .storymap-phase {
        break-inside: avoid;
        border: ${params.line_thickness_mm}mm solid #E8D5C4;
        border-radius: 12px;
        overflow: hidden;
        background: white;
        min-width: 0;
      }
      .phase-header {
        background: linear-gradient(135deg, #FFB5A7, #FFDAC6);
        padding: 8px 10px;
        text-align: center;
      }
      .phase-number {
        display: inline-block;
        background: #E07A5F;
        color: white;
        width: 24px;
        height: 24px;
        line-height: 24px;
        border-radius: 50%;
        font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .phase-name {
        font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
        font-weight: 600;
        color: #5A3E2B;
      }
      .phase-body {
        padding: 10px;
      }
      .phase-emotion {
        display: inline-block;
        background: #B8E0D2;
        color: #3D6B5E;
        padding: 2px 10px;
        border-radius: 8px;
        font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
        margin-top: 6px;
      }
      .storymap-arrow {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        min-width: 40px;
      }
      .arrow-label {
        font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;
        color: #C4A882;
        margin-bottom: 2px;
        text-align: center;
      }
      .arrow-icon {
        font-size: ${Math.round(params.font_size_body_pt * 1.2)}pt;
        color: #E07A5F;
      }
      @media print {
        .storymap-container {
          grid-template-columns: ${data.phases
            .map((_, i) =>
              i < data.phases.length - 1 ? "1fr auto" : "1fr"
            )
            .join(" ")};
        }
      }
    </style>

    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="storymap-container">
      ${phasesHtml}
    </div>

    ${writingHtml}
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
