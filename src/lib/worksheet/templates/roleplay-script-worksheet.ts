/**
 * Roleplay script worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/roleplay-script-worksheet
 */

import type { RoleplayScriptWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

/** Speaker color palette for script formatting */
const SPEAKER_COLORS = [
  { bg: "#E07A5F", text: "#FFFFFF" },
  { bg: "#7FBFB0", text: "#FFFFFF" },
  { bg: "#8B6AAF", text: "#FFFFFF" },
  { bg: "#C4956A", text: "#FFFFFF" },
];

export function renderRoleplayScriptWorksheet(
  data: RoleplayScriptWorksheetOutput,
  params: DerivedParams
): string {
  const scriptStyles = `
    <style>
      .cast-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 12px 0;
      }
      .cast-card {
        padding: 12px;
        border: ${params.line_thickness_mm}mm solid #E8D5C4;
        border-radius: 10px;
        background: #FAFAF5;
        text-align: center;
      }
      .cast-name {
        font-weight: 700;
        font-size: ${params.font_size_body_pt}pt;
        margin-bottom: 4px;
      }
      .cast-role {
        font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
        color: #8B6B57;
        margin-bottom: 4px;
      }
      .cast-costume {
        font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
        color: #C4A882;
        font-style: italic;
      }
      .scene-block {
        break-inside: avoid;
        margin-bottom: 24px;
        padding: 16px;
        background: white;
        border-radius: 12px;
        border: ${params.line_thickness_mm}mm solid #E8D5C4;
      }
      .scene-title {
        font-size: ${Math.round(params.font_size_body_pt * 1.1)}pt;
        font-weight: 700;
        color: #E07A5F;
        margin: 0 0 8px 0;
        padding-bottom: 8px;
        border-bottom: 1px dashed #FFB5A7;
      }
      .narrator-line {
        font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
        color: #8B6B57;
        font-style: italic;
        padding: 8px 12px;
        background: #FFF8F0;
        border-radius: 6px;
        margin-bottom: 12px;
        line-height: 1.6;
      }
      .script-line {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 10px;
        padding: 6px 0;
      }
      .speaker-badge {
        flex-shrink: 0;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
        font-weight: 700;
        min-width: 60px;
        text-align: center;
      }
      .line-content {
        flex: 1;
        font-size: ${params.font_size_body_pt}pt;
        line-height: 1.6;
      }
      .stage-direction {
        font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
        color: #8B6B57;
        font-style: italic;
        margin-left: 70px;
        margin-bottom: 6px;
      }
      .emotion-cue {
        font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
        color: #C4A882;
        margin-left: 4px;
      }
      .props-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 8px 0;
      }
      .prop-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #FAFAF5;
        border: 1px solid #E8D5C4;
        border-radius: 8px;
        font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
      }
      .prop-checkbox {
        width: 16px;
        height: 16px;
        border: 2px solid #C4A882;
        border-radius: 3px;
        flex-shrink: 0;
      }
    </style>`;

  // Build speaker color map
  const speakerColorMap: Record<string, { bg: string; text: string }> = {};
  data.characters_list.forEach((char, i) => {
    speakerColorMap[char.name] = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
  });

  const castHtml = data.characters_list
    .map(
      (char, i) => `
      <div class="cast-card" style="border-top: 3px solid ${SPEAKER_COLORS[i % SPEAKER_COLORS.length].bg};">
        <div class="cast-name">${escapeHtml(char.name)}</div>
        <div class="cast-role">${escapeHtml(char.role_description)}</div>
        <div class="cast-costume">👗 ${escapeHtml(char.costume_hint)}</div>
      </div>`
    )
    .join("");

  const scenesHtml = data.scenes
    .map(
      (scene, si) => {
        const linesHtml = scene.lines
          .map((l) => {
            const color = speakerColorMap[l.speaker] || SPEAKER_COLORS[0];
            const directionHtml = l.stage_direction
              ? `<div class="stage-direction">(${escapeHtml(l.stage_direction)})</div>`
              : "";
            const emotionHtml = l.emotion_cue
              ? `<span class="emotion-cue">[${escapeHtml(l.emotion_cue)}]</span>`
              : "";

            return `
            ${directionHtml}
            <div class="script-line">
              <span class="speaker-badge" style="background: ${color.bg}; color: ${color.text};">${escapeHtml(l.speaker)}</span>
              <div class="line-content">
                ${escapeHtml(l.line)} ${emotionHtml}
              </div>
            </div>`;
          })
          .join("");

        return `
        <div class="scene-block">
          <div class="scene-title">장면 ${si + 1}. ${escapeHtml(scene.scene_title)}</div>
          <div class="narrator-line">📖 ${escapeHtml(scene.narrator_line)}</div>
          ${linesHtml}
        </div>`;
      }
    )
    .join("");

  const propsHtml =
    data.props_list.length > 0
      ? `
    <div class="activity-block">
      <h3 style="margin: 0 0 12px 0; color: #E07A5F;">🎒 준비물 체크리스트</h3>
      <div class="props-grid">
        ${data.props_list
          .map(
            (prop) => `
          <div class="prop-item">
            <div class="prop-checkbox"></div>
            ${escapeHtml(prop)}
          </div>`
          )
          .join("")}
      </div>
    </div>`
      : "";

  const discussionHtml = data.discussion_after
    ? `
    <div class="activity-block" style="border-color: #B8E0D2;">
      <h3 style="margin: 0 0 8px 0; color: #3D6B5E;">🗣️ 공연 후 이야기 나누기</h3>
      <div class="activity-instruction">${escapeHtml(data.discussion_after)}</div>
      <div class="writing-lines">
        ${Array.from({ length: 3 }, () => '<div class="line"></div>').join("")}
      </div>
    </div>`
    : "";

  const content = `
    ${scriptStyles}

    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="activity-block">
      <h3 style="margin: 0 0 12px 0; color: #E07A5F;">🎭 등장인물</h3>
      <div class="cast-grid">
        ${castHtml}
      </div>
    </div>

    ${propsHtml}
    ${scenesHtml}
    ${discussionHtml}
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
