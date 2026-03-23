/**
 * Roleplay script worksheet HTML template.
 * @module worksheet/templates/roleplay-script-worksheet
 */

import type { RoleplayScriptWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml, INITIAL_CIRCLE_COLORS } from "./worksheet-base";

/** Speaker color palette */
const SPEAKER_COLORS = INITIAL_CIRCLE_COLORS;

export function renderRoleplayScriptWorksheet(
  data: RoleplayScriptWorksheetOutput,
  params: DerivedParams
): string {
  const scriptStyles = `
    <style>
      .cast-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
        margin: 10px 0;
      }
      .cast-card {
        padding: 10px;
        border: 1px solid #E0E0E0;
        border-radius: 6px;
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
        color: #B0A090;
        font-style: italic;
      }
      .scene-block {
        break-inside: avoid;
        margin-bottom: 20px;
        padding: 14px;
        background: white;
        border-radius: 6px;
        border: 1px solid #E0E0E0;
      }
      .scene-title {
        font-size: ${Math.round(params.font_size_body_pt * 1.05)}pt;
        font-weight: 600;
        color: #E07A5F;
        margin: 0 0 8px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid #E0E0E0;
      }
      .narrator-line {
        font-size: ${Math.round(params.font_size_body_pt * 0.9)}pt;
        color: #8B6B57;
        font-style: italic;
        padding: 8px 12px;
        background: #FAF6F1;
        border-radius: 4px;
        margin-bottom: 12px;
        line-height: 1.6;
      }
      .script-line {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 8px;
        padding: 4px 0;
      }
      .speaker-badge {
        flex-shrink: 0;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;
        font-weight: 700;
        min-width: 56px;
        text-align: center;
        color: white;
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
        margin-left: 66px;
        margin-bottom: 4px;
      }
      .emotion-cue {
        font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
        color: #B0A090;
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
        padding: 5px 10px;
        background: #FAFAF5;
        border: 1px solid #E0E0E0;
        border-radius: 4px;
        font-size: ${Math.round(params.font_size_body_pt * 0.85)}pt;
      }
      .prop-checkbox {
        width: 14px;
        height: 14px;
        border: 1.5px solid #B0A090;
        border-radius: 2px;
        flex-shrink: 0;
      }
    </style>`;

  const speakerColorMap: Record<string, string> = {};
  data.characters_list.forEach((char, i) => {
    speakerColorMap[char.name] = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
  });

  const castHtml = data.characters_list
    .map(
      (char, i) => `
      <div class="cast-card" style="border-top: 3px solid ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]};">
        <div class="cast-name">${escapeHtml(char.name)}</div>
        <div class="cast-role">${escapeHtml(char.role_description)}</div>
        <div class="cast-costume">${escapeHtml(char.costume_hint)}</div>
      </div>`
    )
    .join("");

  const scenesHtml = data.scenes
    .map((scene, si) => {
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
              <span class="speaker-badge" style="background: ${color};">${escapeHtml(l.speaker)}</span>
              <div class="line-content">
                ${escapeHtml(l.line)} ${emotionHtml}
              </div>
            </div>`;
        })
        .join("");

      return `
        <div class="scene-block">
          <div class="scene-title">장면 ${si + 1}. ${escapeHtml(scene.scene_title)}</div>
          <div class="narrator-line">${escapeHtml(scene.narrator_line)}</div>
          ${linesHtml}
        </div>`;
    })
    .join("");

  const propsHtml =
    data.props_list.length > 0
      ? `
    <div class="activity-block">
      <h3 class="ws-section-title">준비물 체크리스트</h3>
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
    <div class="activity-block">
      <h3 class="ws-section-title">공연 후 이야기 나누기</h3>
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
      <h3 class="ws-section-title">등장인물</h3>
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
