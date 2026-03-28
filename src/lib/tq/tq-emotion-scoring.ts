/**
 * 딸깍 동화 — 5차원 감정 스코어링 엔진 (백엔드 전용)
 * Phase별 가중치를 적용하여 최종 감정 프로필을 계산
 */

export interface EmotionScores {
  burnout: number;
  guilt: number;
  identity_loss: number;
  loneliness: number;
  hope: number;
}

export interface ResponseItem {
  phase: number;
  question_id: string;
  scores: EmotionScores;
}

export type EmotionCategory =
  | 'parenting_burnout'
  | 'identity_loss'
  | 'guilt'
  | 'loneliness'
  | 'perfectionism'
  | 'career_discontinuity'
  | 'anger'
  | 'anxiety'
  | 'sadness'
  | 'marital_conflict'
  | 'social_comparison'
  | 'inlaw_conflict'
  | 'postpartum_depression'
  | 'identity_crisis';

const PHASE_WEIGHTS: Record<number, number> = {
  1: 0.15,
  2: 0.20,
  3: 0.25,
  4: 0.25,
  5: 0.15,
};

const SCORE_KEYS: (keyof EmotionScores)[] = [
  'burnout', 'guilt', 'identity_loss', 'loneliness', 'hope',
];

function emptyScores(): EmotionScores {
  return { burnout: 0, guilt: 0, identity_loss: 0, loneliness: 0, hope: 0 };
}

function averageScores(items: EmotionScores[]): EmotionScores {
  if (items.length === 0) return emptyScores();
  const sum = emptyScores();
  for (const item of items) {
    for (const key of SCORE_KEYS) {
      sum[key] += item[key];
    }
  }
  for (const key of SCORE_KEYS) {
    sum[key] = Math.round(sum[key] / items.length);
  }
  return sum;
}

export function calculatePhaseScores(responses: ResponseItem[]): EmotionScores {
  const byPhase: Record<number, EmotionScores[]> = {};
  for (const r of responses) {
    if (!byPhase[r.phase]) byPhase[r.phase] = [];
    byPhase[r.phase].push(r.scores);
  }

  const final = emptyScores();
  for (const [phaseStr, items] of Object.entries(byPhase)) {
    const phase = Number(phaseStr);
    const weight = PHASE_WEIGHTS[phase] ?? 0;
    const avg = averageScores(items);
    for (const key of SCORE_KEYS) {
      final[key] += avg[key] * weight;
    }
  }

  for (const key of SCORE_KEYS) {
    final[key] = Math.round(final[key]);
  }

  return final;
}

export function accumulateScores(responses: ResponseItem[]): EmotionScores {
  const all = responses.map((r) => r.scores);
  return averageScores(all);
}

export function classifyPrimaryEmotion(scores: EmotionScores): EmotionCategory {
  const { burnout, guilt, identity_loss, loneliness } = scores;

  if (burnout >= 60 && identity_loss < 50) return 'parenting_burnout';
  if (identity_loss >= 60) return 'identity_loss';
  if (guilt >= 60) return 'guilt';
  if (loneliness >= 60 && burnout < 40) return 'loneliness';
  if (burnout >= 50 && guilt >= 50) return 'perfectionism';
  if (loneliness >= 50 && identity_loss >= 50) return 'career_discontinuity';

  const dims = [
    { key: 'burnout' as const, val: burnout },
    { key: 'guilt' as const, val: guilt },
    { key: 'identity_loss' as const, val: identity_loss },
    { key: 'loneliness' as const, val: loneliness },
  ].sort((a, b) => b.val - a.val);

  const top = dims[0];
  if (top.key === 'burnout') return 'parenting_burnout';
  if (top.key === 'guilt') return 'guilt';
  if (top.key === 'identity_loss') return 'identity_loss';
  return 'loneliness';
}

export function classifySecondaryEmotion(
  scores: EmotionScores,
  primary: EmotionCategory,
): EmotionCategory | null {
  const dims = [
    { key: 'burnout' as const, category: 'parenting_burnout' as EmotionCategory },
    { key: 'guilt' as const, category: 'guilt' as EmotionCategory },
    { key: 'identity_loss' as const, category: 'identity_loss' as EmotionCategory },
    { key: 'loneliness' as const, category: 'loneliness' as EmotionCategory },
  ]
    .filter((d) => d.category !== primary)
    .sort((a, b) => scores[b.key] - scores[a.key]);

  const top = dims[0];
  if (top && scores[top.key] >= 40) return top.category;
  return null;
}

export function classifyEmotionProfile(scores: EmotionScores): {
  primary: EmotionCategory;
  secondary: EmotionCategory | null;
} {
  const primary = classifyPrimaryEmotion(scores);
  const secondary = classifySecondaryEmotion(scores, primary);
  return { primary, secondary };
}
