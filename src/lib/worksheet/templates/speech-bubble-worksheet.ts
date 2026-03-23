/**
 * Speech bubble worksheet HTML template.
 * @module worksheet/templates/speech-bubble-worksheet
 */

import type { SpeechBubbleWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml, escapeHtml, getCharacterInitial, INITIAL_CIRCLE_COLORS } from "./worksheet-base";

export function renderSpeechBubbleWorksheet(
  data: SpeechBubbleWorksheetOutput,
  params: DerivedParams
): string {
  // Build character color map by appearance order
  const charColorMap = new Map<string, number>();
  let colorIdx = 0;
  for (const pair of data.dialogue_pairs) {
    if (!charColorMap.has(pair.character)) {
      charColorMap.set(pair.character, colorIdx++);
    }
  }

  const bubbleStyles = `
    <style>
      .bubble-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 16px;
        gap: 10px;
      }
      .bubble-row.right {
        flex-direction: row-reverse;
      }
      .bubble-character {
        flex-shrink: 0;
        width: 56px;
        text-align: center;
      }
      .bubble-character-name {
        font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
        color: #8B6B57;
        font-weight: 500;
        margin-top: 4px;
      }
      .bubble-content {
        flex: 1;
        max-width: 70%;
      }
      .bubble-speech {
        background: white;
        border: 1px solid #D0D0D0;
        border-radius: 14px;
        padding: 10px 14px;
        position: relative;
        font-size: ${params.font_size_body_pt}pt;
        line-height: 1.6;
      }
      .bubble-row.left .bubble-speech::before {
        content: '';
        position: absolute;
        left: -8px;
        top: 14px;
        width: 0;
        height: 0;
        border: 5px solid transparent;
        border-right-color: #D0D0D0;
      }
      .bubble-row.left .bubble-speech::after {
        content: '';
        position: absolute;
        left: -6px;
        top: 16px;
        width: 0;
        height: 0;
        border: 3px solid transparent;
        border-right-color: white;
      }
      .bubble-row.right .bubble-speech::before {
        content: '';
        position: absolute;
        right: -8px;
        top: 14px;
        width: 0;
        height: 0;
        border: 5px solid transparent;
        border-left-color: #D0D0D0;
      }
      .bubble-row.right .bubble-speech::after {
        content: '';
        position: absolute;
        right: -6px;
        top: 16px;
        width: 0;
        height: 0;
        border: 3px solid transparent;
        border-left-color: white;
      }
      .bubble-thought {
        background: white;
        border: 1px solid #C8B8D8;
        border-radius: 20px;
        padding: 10px 14px;
        font-size: ${params.font_size_body_pt}pt;
        line-height: 1.6;
      }
      .bubble-shout {
        background: #FFF5F0;
        border: 2px solid #E07A5F;
        border-radius: 4px;
        padding: 10px 14px;
        font-size: ${params.font_size_body_pt}pt;
        font-weight: 600;
        line-height: 1.6;
      }
      .bubble-empty {
        border-style: dashed !important;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #B0A090;
      }
      .bubble-emotion-tag {
        font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;
        color: #8B6B57;
        margin-top: 3px;
        font-style: italic;
      }
    </style>`;

  const dialogueHtml = data.dialogue_pairs
    .map((pair) => {
      const ci = charColorMap.get(pair.character) ?? 0;
      const bubbleClass = `bubble-${pair.bubble_type}${pair.is_empty ? " bubble-empty" : ""}`;
      const lineContent = pair.is_empty
        ? `<span style="font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;">${params.instruction_complexity === "icon_only" ? "써요!" : "여기에 대사를 써보세요"}</span>`
        : escapeHtml(pair.line);

      return `
      <div class="bubble-row ${pair.position}">
        <div class="bubble-character">
          <span class="initial-circle" style="background: ${INITIAL_CIRCLE_COLORS[ci % INITIAL_CIRCLE_COLORS.length]}; width: 40px; height: 40px; font-size: 13pt;">${getCharacterInitial(pair.character)}</span>
          <div class="bubble-character-name">${escapeHtml(pair.character)}</div>
        </div>
        <div class="bubble-content">
          <div class="${bubbleClass}">
            ${lineContent}
          </div>
          <div class="bubble-emotion-tag">(${escapeHtml(pair.emotion)})</div>
        </div>
      </div>`;
    })
    .join("");

  const freeDialogueHtml = data.free_dialogue_prompt
    ? `
    <div class="activity-block">
      <h3 class="ws-section-title">자유 대화 만들기</h3>
      <div class="drawing-area-label">${escapeHtml(data.free_dialogue_prompt)}</div>
      <div style="display: flex; gap: 14px; margin-top: 10px;">
        <div style="flex: 1;">
          <div class="bubble-speech bubble-empty" style="min-height: 50px; border: 1px dashed #B0A090; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #B0A090; padding: 10px;">
            첫 번째 대사
          </div>
        </div>
        <div style="flex: 1;">
          <div class="bubble-speech bubble-empty" style="min-height: 50px; border: 1px dashed #B0A090; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #B0A090; padding: 10px;">
            두 번째 대사
          </div>
        </div>
      </div>
    </div>`
    : "";

  const content = `
    ${bubbleStyles}

    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="activity-block">
      <h3 class="ws-section-title">말풍선 대화</h3>
      ${dialogueHtml}
    </div>

    ${freeDialogueHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}
