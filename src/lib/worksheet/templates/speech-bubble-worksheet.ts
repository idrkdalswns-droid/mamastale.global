/**
 * Speech bubble worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/speech-bubble-worksheet
 */

import type { SpeechBubbleWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderSpeechBubbleWorksheet(
  data: SpeechBubbleWorksheetOutput,
  params: DerivedParams
): string {
  const bubbleStyles = `
    <style>
      .bubble-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 20px;
        gap: 12px;
      }
      .bubble-row.right {
        flex-direction: row-reverse;
      }
      .bubble-character {
        flex-shrink: 0;
        width: 60px;
        text-align: center;
      }
      .bubble-character-circle {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #FFF0E8;
        border: 2px solid #E8D5C4;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 4px;
        font-size: 14pt;
      }
      .bubble-character-name {
        font-size: ${Math.round(params.font_size_body_pt * 0.75)}pt;
        color: #8B6B57;
        font-weight: 500;
      }
      .bubble-content {
        flex: 1;
        max-width: 70%;
      }
      /* Speech bubble (rounded) */
      .bubble-speech {
        background: white;
        border: 2px solid #E8D5C4;
        border-radius: 18px;
        padding: 12px 16px;
        position: relative;
        font-size: ${params.font_size_body_pt}pt;
        line-height: 1.6;
      }
      .bubble-row.left .bubble-speech::before {
        content: '';
        position: absolute;
        left: -10px;
        top: 16px;
        width: 0;
        height: 0;
        border: 6px solid transparent;
        border-right-color: #E8D5C4;
      }
      .bubble-row.left .bubble-speech::after {
        content: '';
        position: absolute;
        left: -7px;
        top: 18px;
        width: 0;
        height: 0;
        border: 4px solid transparent;
        border-right-color: white;
      }
      .bubble-row.right .bubble-speech::before {
        content: '';
        position: absolute;
        right: -10px;
        top: 16px;
        width: 0;
        height: 0;
        border: 6px solid transparent;
        border-left-color: #E8D5C4;
      }
      .bubble-row.right .bubble-speech::after {
        content: '';
        position: absolute;
        right: -7px;
        top: 18px;
        width: 0;
        height: 0;
        border: 4px solid transparent;
        border-left-color: white;
      }
      /* Thought bubble (cloud) */
      .bubble-thought {
        background: white;
        border: 2px solid #C8B8D8;
        border-radius: 24px;
        padding: 12px 16px;
        position: relative;
        font-size: ${params.font_size_body_pt}pt;
        line-height: 1.6;
      }
      .bubble-row.left .bubble-thought::before {
        content: '...';
        position: absolute;
        left: -4px;
        bottom: -16px;
        font-size: 16pt;
        color: #C8B8D8;
        letter-spacing: -2px;
      }
      .bubble-row.right .bubble-thought::before {
        content: '...';
        position: absolute;
        right: -4px;
        bottom: -16px;
        font-size: 16pt;
        color: #C8B8D8;
        letter-spacing: -2px;
      }
      /* Shout bubble (jagged) */
      .bubble-shout {
        background: #FFF5F0;
        border: 3px solid #E07A5F;
        border-radius: 4px;
        padding: 12px 16px;
        position: relative;
        font-size: ${params.font_size_body_pt}pt;
        font-weight: 700;
        line-height: 1.6;
        box-shadow: 2px 2px 0 #E07A5F33;
      }
      /* Empty bubble (dashed) */
      .bubble-empty {
        border-style: dashed !important;
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #C4A882;
      }
      .bubble-emotion-tag {
        font-size: ${Math.round(params.font_size_body_pt * 0.7)}pt;
        color: #8B6B57;
        margin-top: 4px;
        font-style: italic;
      }
    </style>`;

  const dialogueHtml = data.dialogue_pairs
    .map((pair) => {
      const bubbleClass = `bubble-${pair.bubble_type}${pair.is_empty ? " bubble-empty" : ""}`;
      const lineContent = pair.is_empty
        ? `<span style="font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt;">✏️ ${params.instruction_complexity === "icon_only" ? "써요!" : "여기에 대사를 써보세요"}</span>`
        : escapeHtml(pair.line);

      return `
      <div class="bubble-row ${pair.position}">
        <div class="bubble-character">
          <div class="bubble-character-circle">${getCharacterEmoji(pair.character)}</div>
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
    <div class="activity-block" style="border-color: #B8E0D2;">
      <h3 style="margin: 0 0 8px 0; color: #3D6B5E;">💬 자유 대화 만들기</h3>
      <div class="activity-instruction">${escapeHtml(data.free_dialogue_prompt)}</div>
      <div style="display: flex; gap: 16px; margin-top: 12px;">
        <div style="flex: 1;">
          <div class="bubble-speech bubble-empty" style="min-height: 50px; border: 2px dashed #C4A882; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #C4A882; padding: 12px;">
            ✏️
          </div>
        </div>
        <div style="flex: 1;">
          <div class="bubble-speech bubble-empty" style="min-height: 50px; border: 2px dashed #C4A882; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #C4A882; padding: 12px;">
            ✏️
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
      <h3 style="margin: 0 0 16px 0; color: #E07A5F;">💬 말풍선 대화</h3>
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

function getCharacterEmoji(name: string): string {
  // Simple heuristic: use first character or fallback emoji
  const emojiMap: Record<string, string> = {
    엄마: "👩",
    아빠: "👨",
    할머니: "👵",
    할아버지: "👴",
    아이: "👧",
    친구: "🧒",
    선생님: "👩‍🏫",
    왕: "👑",
    공주: "👸",
    왕자: "🤴",
    토끼: "🐰",
    곰: "🐻",
    여우: "🦊",
    사자: "🦁",
    강아지: "🐶",
    고양이: "🐱",
    새: "🐦",
    물고기: "🐟",
    나무: "🌳",
  };
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (name.includes(key)) return emoji;
  }
  return "🧑";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
