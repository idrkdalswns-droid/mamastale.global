/**
 * Emotion worksheet HTML template.
 * Renders Claude's structured output into printable A4 HTML.
 *
 * @module worksheet/templates/emotion-worksheet
 */

import type { EmotionWorksheetOutput } from "../schemas";
import type { DerivedParams } from "../types";
import { worksheetBaseHtml } from "./worksheet-base";

export function renderEmotionWorksheet(
  data: EmotionWorksheetOutput,
  params: DerivedParams
): string {
  const emotionIconsHtml = data.emotion_icons
    .map(
      (icon) => `
    <div class="emotion-icon-item">
      <div style="font-size: 28pt; margin-bottom: 4px;">${getEmotionEmoji(icon.emotion)}</div>
      <div>${escapeHtml(icon.label)}</div>
    </div>`
    )
    .join("");

  const scenesHtml = data.emotion_scenes
    .map(
      (scene, i) => `
    <div class="activity-block">
      <div class="question-item">
        <div class="question-text">${i + 1}. ${escapeHtml(scene.question)}</div>
        <div style="font-size: ${Math.round(params.font_size_body_pt * 0.8)}pt; color: #8B6B57; margin-bottom: 8px;">
          (${escapeHtml(scene.character)}의 장면: ${escapeHtml(scene.scene_summary)})
        </div>
      </div>
      <div class="drawing-area" style="min-height: ${Math.round(150 * params.drawing_space_ratio)}px;">
        🖍️ ${params.instruction_complexity === "icon_only" ? "그려요!" : "감정 얼굴을 그려보세요"}
      </div>
      ${params.writing_ratio > 0.2 ? `
      <div class="writing-lines">
        ${Array.from({ length: 2 }, () => '<div class="line"></div>').join("")}
      </div>` : ""}
    </div>`
    )
    .join("");

  const bodyMappingHtml = data.body_mapping_prompt
    ? `
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.body_mapping_prompt)}</div>
      <div class="drawing-area" style="min-height: 200px;">
        🧒 몸에서 감정이 느껴지는 곳에 색칠해보세요
      </div>
    </div>`
    : "";

  const content = `
    <div class="activity-block">
      <div class="activity-instruction">${escapeHtml(data.instructions)}</div>
    </div>

    <div class="activity-block">
      <h3 style="margin: 0 0 12px 0; color: #E07A5F;">감정 아이콘</h3>
      <div class="emotion-icon-grid">
        ${emotionIconsHtml}
      </div>
    </div>

    ${scenesHtml}
    ${bodyMappingHtml}
  `;

  return worksheetBaseHtml(content, params, {
    title: data.title,
    subtitle: data.subtitle,
    nuri_domain: data.nuri_domain,
  });
}

function getEmotionEmoji(emotion: string): string {
  const map: Record<string, string> = {
    기쁨: "😊", 행복: "😊", 즐거움: "😄",
    슬픔: "😢", 우울: "😢",
    화남: "😠", 분노: "😠",
    무서움: "😨", 공포: "😨", 두려움: "😨",
    놀람: "😲", 깜짝: "😲",
    부끄러움: "😳",
    걱정: "😟", 불안: "😟",
    외로움: "🥺",
    자랑스러움: "🤩", 뿌듯함: "🤩",
    감사: "🥰", 사랑: "🥰",
  };
  return map[emotion] || "💭";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
