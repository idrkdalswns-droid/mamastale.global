/**
 * 딸깍 동화 — 표지 일러스트 프롬프트 엔진
 * Gemini 기반 커버 이미지 생성용
 * 감정별 자연 은유 비주얼 맵 + 스타일 프리픽스/서픽스
 */

import type { EmotionCategory } from './tq-emotion-scoring';

/* ── 스타일 상수 ── */

export const TQ_STYLE_PREFIX = `\
Healing illustration for a mother's personal fairy tale.
Soft watercolor painting with gentle warm tones.
Full bleed composition — artwork extends to ALL edges.
Muted warm palette: dusty rose, soft amber, pale sage, warm ivory.
Dreamy, intimate atmosphere — a personal emotional landscape.
Gentle light source suggesting warmth, safety, and self-compassion.
No text, no title, no words anywhere in the image.`;

export const TQ_STYLE_SUFFIX = `\
Single cohesive cover composition. Vertical 3:4 format.
The illustration must fill the entire canvas edge-to-edge.
Evokes the feeling of being seen and embraced.
Professional illustration quality. Soft golden lighting.
Korean nature-inspired aesthetic — seasons, forests, water, sky.`;

/* ── 14 감정별 비주얼 맵 ── */

const EMOTION_VISUAL_MAP: Record<EmotionCategory, string> = {
  parenting_burnout:
    'A small hedgehog with sharp quills curled up in an autumn leaf forest, warm amber light filtering through maple leaves, soft belly hidden beneath spines',
  identity_loss:
    'A flower losing its colors in a faded garden, one petal starting to regain soft pink near a reflective pond, roots still alive underground',
  guilt:
    'A small bird on a high cliff nest with tiny stones tied to its wings, golden dawn light breaking through clouds above, feathers ruffled by gentle wind',
  loneliness:
    'A single firefly glowing alone on a summer night rice paddy path, hints of other distant lights appearing behind tall grass',
  anger:
    'A tiny tiger cub roaring in a lush Korean mountain forest, enormous energy in a small body, warm sunlight dappling through bamboo',
  anxiety:
    'A rabbit with alert ears in a winter forest, snow-covered pines, a tiny green sprout visible where warm breath melts the snow',
  sadness:
    'A weeping willow by a summer rain creek, branches dipping into flowing water, sadness flowing downstream while roots hold firm',
  marital_conflict:
    'Two trees growing from one root in opposite directions in a deep forest, their canopy leaves touching and intertwining above',
  perfectionism:
    'A potter\'s cracked ceramic bowl in a mountain kiln, tiny wildflowers growing through the golden cracks, warm firelight',
  social_comparison:
    'A bird perched high on a branch watching others walk below, wind beginning to lift its forgotten wings, Korean mountain backdrop',
  career_discontinuity:
    'A fallen star tending a moonlit garden, glowing softly among night-blooming flowers, finding a different kind of radiance on earth',
  inlaw_conflict:
    'A weaver between two looms with different patterns in an old workshop, beginning to weave her own unique design with golden thread',
  postpartum_depression:
    'A small island in a misty Korean sea, morning fog beginning to lift revealing warm golden sand and wildflowers on shore',
  identity_crisis:
    'A woman in a room of blurred reflections, discovering her clear face in a still water puddle on the floor, soft light from a window',
};

/* ── 프롬프트 빌더 ── */

export function buildTQCoverPrompt(primaryEmotion: EmotionCategory): string {
  const visual = EMOTION_VISUAL_MAP[primaryEmotion];
  return `${TQ_STYLE_PREFIX}\n\n${visual}\n\n${TQ_STYLE_SUFFIX}`;
}

export function getEmotionVisual(emotion: EmotionCategory): string {
  return EMOTION_VISUAL_MAP[emotion];
}
