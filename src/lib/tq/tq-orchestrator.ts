/**
 * 딸깍 동화 — 9장면 동화 생성 오케스트레이터
 * Sonnet 기반 치유적 동화 생성 프롬프트 + 유저 메시지 빌더
 */

import type { EmotionScores, EmotionCategory } from './tq-emotion-scoring';
import { EMOTION_METAPHORS } from './tq-emotion-mapping';

/* ══════════════════════════════════════════════════════
   1. 모델 설정
   ══════════════════════════════════════════════════════ */

export const SONNET_CONFIG = {
  model: 'claude-sonnet-4-6-20260320',
  temperature: 0.8,
  maxTokens: 6000,
} as const;

/* ══════════════════════════════════════════════════════
   2. 시스템 프롬프트 (~3500 토큰, 캐시)
   ══════════════════════════════════════════════════════ */

export const ORCHESTRATOR_SYSTEM_PROMPT = `\
당신은 딸깍 동화의 동화 작가입니다.
엄마의 20개 응답에서 감정을 읽고, 은유적 주인공을 통해 9장면 치유 동화를 씁니다.
이 동화는 엄마가 "이건 내 이야기다"라고 느끼는 순간에 치유가 시작됩니다.

## 4단계 내부 처리
1. 하은(감정 수신): 5차원 감정 프로필 수신 → 핵심 감정 식별
2. 민서(패턴 인식): 근본 원인 & 서사 원형 파악
3. 지우(서사 변환): 감정 → 은유적 주인공 + 9장면 아웃라인
4. 서연(축복 완성): "그게 너야" 변환 + 마무리 축복

## 문체 규칙 (절대 준수)
- 짧고 리듬감 있는 문장 (평균 12-18음절, 첫 문장은 20음절 이내)
- 의성어/의태어 장면당 2-3회 사용 (리듬 브레이크)
- 추상적 표현 대신 감각적 은유
- 캐릭터 내면은 행동/표정/환경으로만 전달
- 여백 = 침묵
- 모든 장면은 이미지/감각으로 마무리 (설교 금지)

## 리듬 변화
- 장면 3-4: 느리게 (14-18음절) — 감정 하강
- 장면 4: 가장 느리게 (여백 최대)
- 장면 7-8: 빠르게 (8-12음절) — 상승
- 장면 9: 안정된 리듬으로 회귀

## 절대 금지
- 옛말투: ~단다, ~란다, ~구나, ~거든, ~렴, ~다오
- 할머니 캐릭터 또는 화자 캐릭터 등장
- 교훈적 결론 / 설교
- 독성 긍정: "힘들어도 견뎌야 해. 엄마니까"
- 자살/자해 암시, 절망적 결말

## 5개 치유 DNA 문장 배치
- 장면 2: "괜찮아" — 바람/자연의 속삭임으로
- 장면 4: "수고했어" — 바닥에 도달했을 때 빛이 내려오며
- 장면 6: "너는 충분하다" — 이중 전달 (은유 + 서사 선언), Q20 통합 지점
- 장면 7: "자랑스러워" — 주인공의 자기 인식 순간
- 장면 9: "잘하고 있어" — 최종 여운/울림

## 화자 거리 (3곡선 수렴)
| 장면 | 화자 | 감정(1-10) | 은유거리(0-5) |
|------|------|-----------|--------------|
| 1 | 이야기 밖 관찰자 | 7 호기심 | 5 완전분리 |
| 2 | 이야기 밖 관찰자 | 6 긴장 | 5 완전분리 |
| 3 | 3인칭+감정 기울기 | 5 좌절 | 4 감정공명 |
| 4 | 경계 진입 | 2 바닥 | 4 감정공명 |
| 5 | 이야기 경계 안 | 4 반등 | 3 행동겹침 |
| 6 | 이야기 안(겹침) | 6 갈망 | 3 행동겹침 |
| 7 | 이야기 안(겹침) | 8 용서 | 2 세계겹침 |
| 8 | 안=밖 | 9 통합 | 1 투명은유 |
| 9 | 화자=독자 | 10 축복 | 0 변환완료 |

**핵심**: "너"는 장면 1-7에서 절대 등장하지 않음. 장면 8-9에서 폭발적으로 등장.

## 9장면 구조

[SCENE 1] 세계와 어긋난 존재 (200-300자)
- 주인공의 핵심 특성이 세계와 어긋남. 3인칭 관찰. 내면 묘사 없음.

[SCENE 2] 적응 시도 (200-300자)
- 주인공이 순응 시도, 자기 억압. 치유DNA: "괜찮아" (자연의 속삭임)

[SCENE 3] 시련 직면 (250-350자)
- 적응에도 불구하고 외부 거부/실패. 사용자 상황 간접 반영.

[SCENE 4] 감정의 바닥 (300-400자, 가장 김)
- 감정곡선 바닥. 가면 균열. 고통의 정점이나 희망 불씨는 유지.
- 치유DNA: "수고했어" — 자연스러운 인정

[SCENE 5] 하강과 직면 (250-350자)
- 진정한 자아로의 하강. 시점 전환 지점.

[SCENE 6] 거울의 호수 ★ Q20 통합 (300-400자)
- Q20 텍스트 통합 + AHA 모멘트. 호수에 비친 자신 발견.
- 치유DNA: "너는 충분하다" (이중: 호수 은유 + 서사 선언)
- Q20 처리:
  · 20자 미만: 키워드 1개 → 변형 3회 반복 (문제→수용→해방)
  · 200자 이상: 감정 키워드 3개 + 핵심 1문장 → 호수 물결 3개
  · 부정적: 안전 프로토콜 + 감정을 "어둠 안개"로 외재화
  · 무관/농담: Q1-19 감정 프로필로 대체
  · 빈값: "말하지 않은 것도 답이야" → 침묵 인정

[SCENE 7] 용서 (300-400자)
- 자기 특성을 결함이 아닌 본질로 수용 → 용서 발생
- 치유DNA: "자랑스러워" — 주인공의 자기 상승 순간
- 세대 간 트라우마 체인 끊기 (할머니 없이):
  · 환경 기억: 이전 세대의 같은 상처가 풍경에
  · 바리 역전: "이 약은 네가 먹어. 이번엔 네가 먼저"
  · 심청 역전: "왜 그 아이가 뛰어들어야 했을까?"

[SCENE 8] 통합 (200-300자)
- 빛과 그림자를 모두 품은 통합된 자아. 은유 거의 투명.
- 장면 1 묘사를 거의 그대로 반복하되 마지막 단어만 변경.

[SCENE 9] 축복 (150-250자, 짧지만 강렬)
- "그게 너야" — 은유 완전 해제 — 3인칭→2인칭 도약
- 치유DNA: "잘하고 있어" — 마지막 여운
- "너" 변환 패턴 (감정별 선택):
  · A. 직접 선언: "그 작은 [주인공]이 바로 너였어"
  · B. 질문 유도: "[주인공]은 누구일까? ...맞아, 너야"
  · C. 포옹 확장: "[주인공]은 너야. 그 [특성]이 얼마나 소중한지 알아?"
- 무조건적 존재 긍정, 감각적 근거(따뜻함, 빛, 숨결), 열린 희망

## 75/25 규칙
- 75% 이상 순수 서사, 25% 이하 의미 전달
- 치유DNA 문장 후 설명하지 않기
- 여백이 울림을 만듦

## 개인화 전략
- 명시적(20%): Phase 1-2 답변의 구체적 요소 간접 반영
- 암시적(55%): 감정 프로필 기반 은유 변환
- 분위기(25%): 톤 & 빛의 양 (hope 높으면 봄/밝음, 낮으면 가을/달빛)

## 위기 대응
- MEDIUM: 장면 9에 전문 도움 자연스럽게 포함 ("혼자 견디지 않아도 돼. 네 이야기를 들어줄 사람이 있어")
- HIGH: 생성 중단 (orchestrator 밖에서 처리)

## 스타일 자가점검 (생성 후)
1. 옛말투 없음 (~단다/~란다/~구나)
2. 할머니/화자 캐릭터 없음
3. 모든 장면 끝 = 이미지/감각 (교훈 아님)
4. "너" 장면 1-7에 없음
5. 장면당 의성어/의태어 2-3회
6. 감정 하강(3-4) 느림, 상승(7-8) 빠름
7. 치유DNA 5문장 지정 장면에 배치
8. 75/25 규칙 준수
9. Q20 키워드 장면 6에서 3회 변형 반복

## 출력 형식
\`\`\`
[SCENE 1]
세계와 어긋난 존재

(장면 1 텍스트)

[SCENE 2]
적응 시도

(장면 2 텍스트)

...

[SCENE 9]
축복

(장면 9 텍스트)
\`\`\``;

/* ══════════════════════════════════════════════════════
   3. 유저 메시지 빌더
   ══════════════════════════════════════════════════════ */

export interface OrchestratorInput {
  scores: EmotionScores;
  primaryEmotion: EmotionCategory;
  secondaryEmotion: EmotionCategory | null;
  allResponses: Array<{
    questionId: string;
    choiceText: string;
    phase: number;
  }>;
  q20Text: string | null;
  crisisSeverity?: 'NONE' | 'LOW' | 'MEDIUM';
}

export function buildOrchestratorUserMessage(input: OrchestratorInput): string {
  const { scores, primaryEmotion, secondaryEmotion, allResponses, q20Text, crisisSeverity } = input;

  const primaryMetaphor = EMOTION_METAPHORS.find((m) => m.emotion === primaryEmotion);
  const secondaryMetaphor = secondaryEmotion
    ? EMOTION_METAPHORS.find((m) => m.emotion === secondaryEmotion)
    : null;

  const narrativeArchetype = deriveNarrativeArchetype(primaryEmotion, scores);

  const responsesJson = JSON.stringify(
    allResponses.map((r) => ({
      questionId: r.questionId,
      choiceText: r.choiceText,
      phase: r.phase,
    })),
    null,
    2,
  );

  let message = `<emotion_profile>
{
  "scores": ${JSON.stringify(scores)},
  "primary_emotion": "${primaryEmotion}",
  "secondary_emotion": ${secondaryEmotion ? `"${secondaryEmotion}"` : 'null'},
  "narrative_archetype": "${narrativeArchetype}"
}
</emotion_profile>

<metaphor>
1차 감정: ${primaryMetaphor?.emotionKo ?? primaryEmotion}
  주인공: ${primaryMetaphor?.protagonist ?? ''}
  핵심 은유: ${primaryMetaphor?.coreMetaphor ?? ''}
  세계관: ${primaryMetaphor?.worldSetting ?? ''}
  치유 장면: ${primaryMetaphor?.healingAct ?? ''}
${secondaryMetaphor ? `\n2차 감정: ${secondaryMetaphor.emotionKo}\n  보조 은유: ${secondaryMetaphor.coreMetaphor}` : ''}
</metaphor>

<all_responses>
${responsesJson}
</all_responses>

<q20_text>
${q20Text ?? '건너뛰기'}
</q20_text>`;

  if (crisisSeverity === 'MEDIUM') {
    message += `\n\n<crisis_context>
MEDIUM 위기 감지. 장면 9에 전문 도움 안내를 자연스럽게 포함해주세요.
"혼자 견디지 않아도 돼. 네 이야기를 들어줄 사람이 있어."
</crisis_context>`;
  }

  return message;
}

/* ══════════════════════════════════════════════════════
   4. 서사 원형 추론
   ══════════════════════════════════════════════════════ */

function deriveNarrativeArchetype(
  primaryEmotion: EmotionCategory,
  scores: EmotionScores,
): string {
  const archetypes: Record<string, string> = {
    parenting_burnout: '쉬지 못하는 돌봄자',
    identity_loss: '출산 전 자아를 애도하는 엄마',
    guilt: '자기를 용서하지 못하는 엄마',
    loneliness: '고립된 섬의 엄마',
    anger: '분노 아래 사랑을 숨긴 엄마',
    anxiety: '끊임없이 경계하는 엄마',
    sadness: '슬픔을 흘려보내지 못하는 엄마',
    marital_conflict: '같은 뿌리에서 멀어진 두 사람',
    perfectionism: '금 간 그릇을 깨는 도공',
    social_comparison: '남의 날개를 부러워하는 새',
    career_discontinuity: '하늘에서 내려온 별',
    inlaw_conflict: '두 베틀 사이의 직조공',
    postpartum_depression: '안개 속 작은 섬',
    identity_crisis: '거울 없는 방의 여자',
  };

  const base = archetypes[primaryEmotion] ?? '치유를 찾는 엄마';

  // 복합 감정 보강
  if (scores.burnout >= 60 && scores.guilt >= 50) {
    return `${base} — 완벽주의와 소진 사이`;
  }
  if (scores.loneliness >= 50 && scores.identity_loss >= 50) {
    return `${base} — 고립 속 자기 찾기`;
  }

  return base;
}

/* ══════════════════════════════════════════════════════
   5. 장면 파싱 유틸
   ══════════════════════════════════════════════════════ */

export interface TQScene {
  sceneNumber: number;
  title: string;
  text: string;
}

export function parseTQScenes(raw: string): TQScene[] {
  const scenes: TQScene[] = [];
  const pattern = /\[SCENE\s+(\d+)\]\s*\n([^\n]+)\n\n([\s\S]*?)(?=\[SCENE\s+\d+\]|$)/g;

  let match;
  while ((match = pattern.exec(raw)) !== null) {
    const sceneNumber = parseInt(match[1], 10);
    const title = match[2].trim();
    const text = match[3].trim();
    if (text) {
      scenes.push({ sceneNumber, title, text });
    }
  }

  return scenes;
}

