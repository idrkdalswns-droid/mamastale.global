/**
 * 딸깍 동화 — Phase 전환 Haiku 에이전트 (4종)
 * Phase 1→2, 2→3, 3→4, 4→5 전환 시 다음 Phase 질문을 AI 생성
 * p-queue 동시성 제어 + Zod 검증 + 폴백
 */

import { z } from 'zod';
import type { EmotionScores } from './tq-emotion-scoring';

/* ══════════════════════════════════════════════════════
   1. 모델 설정
   ══════════════════════════════════════════════════════ */

export const HAIKU_CONFIG = {
  model: 'claude-haiku-4-5-20251001',
  temperature: 0.7,
  retryTemperature: 0.5,
  maxTokens: 2048,
  maxRetries: 1,
  timeoutMs: 15_000,
} as const;

export const QUEUE_CONFIG = {
  haiku: { concurrency: 20 },
  sonnet: { concurrency: 5 },
} as const;

/* ══════════════════════════════════════════════════════
   2. Zod 스키마
   ══════════════════════════════════════════════════════ */

const emotionScoresSchema = z.object({
  burnout: z.number().int().min(0).max(100),
  guilt: z.number().int().min(0).max(100),
  identity_loss: z.number().int().min(0).max(100),
  loneliness: z.number().int().min(0).max(100),
  hope: z.number().int().min(0).max(100),
});

const choiceSchema = z.object({
  id: z.number().int().min(1).max(4),
  text: z.string().min(5).max(60),
  feedback: z.string().min(5).max(40),
  emotionLabel: z.string(),
  scores: emotionScoresSchema,
});

const questionSchema = z.object({
  id: z.string().regex(/^q\d{1,2}$/),
  text: z.string().min(10).max(80),
  choices: z.array(choiceSchema).length(4),
});

export const phaseTransitionOutputSchema = z.object({
  questions: z.array(questionSchema).min(3).max(4),
});

export const phase5OutputSchema = z.object({
  questions: z.array(questionSchema).min(3).max(3),
  q20_prompt: z.object({
    title: z.string(),
    instruction: z.string(),
    placeholder: z.string(),
    skip_text: z.string(),
  }),
});

/* ══════════════════════════════════════════════════════
   3. 타입
   ══════════════════════════════════════════════════════ */

export interface GeneratedChoice {
  id: number;
  text: string;
  feedback: string;
  emotionLabel: string;
  scores: EmotionScores;
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  choices: GeneratedChoice[];
}

export interface PhaseTransitionOutput {
  questions: GeneratedQuestion[];
}

export interface Phase5Output {
  questions: GeneratedQuestion[];
  q20_prompt: {
    title: string;
    instruction: string;
    placeholder: string;
    skip_text: string;
  };
}

export interface PhaseTransitionInput {
  targetPhase: number; // 2, 3, 4, or 5
  accumulatedScores: EmotionScores;
  previousResponses: Array<{
    questionId: string;
    choiceId: number;
    choiceText: string;
  }>;
}

/* ══════════════════════════════════════════════════════
   4. 시스템 프롬프트 (~800 토큰, 캐시)
   ══════════════════════════════════════════════════════ */

export const PHASE_TRANSITION_SYSTEM_PROMPT = `\
당신은 딸깍 동화(스무고개 동화)의 질문 설계 전문가입니다.
엄마들의 감정을 섬세하게 탐색하는 질문 4개를 생성합니다.

## 12가지 원칙

1. **감정 스펙트럼 설계**: 선택지는 강도의 차이가 아닌 색깔의 차이. 모든 선택지가 자연스럽게 선택 가능해야 함
2. **구체적 시나리오 필수**: 추상적 감정 단어 대신 구체적 장면/상황으로 묘사
3. **말 못하는 것 포함 필수**: 사회적으로 말하기 어려운 감정도 안전하게 선택할 수 있어야 함
4. **한국 엄마 언어**: 존댓말, ~요 체 사용. 자연스러운 구어체
5. **방어기제 우회**: 직접적 질문 대신 은유적/간접적 접근
6. **감정 라벨링(affect labeling)**: 선택지의 feedback이 감정을 부드럽게 이름 붙여줌
7. **외재화(externalization)**: 감정을 자기와 분리하여 관찰 가능하게
8. **정상화(normalization)**: 모든 선택지가 "당연한" 감정임을 전제
9. **5차원 스코어링**: burnout/guilt/identity_loss/loneliness/hope (각 0-100)
10. **Phase별 깊이**: Phase 2→일상 감정, Phase 3→깊은 감정, Phase 4→핵심 감정, Phase 5→희망/통합
11. **중복 회피**: 이전 질문과 겹치지 않는 새로운 각도
12. **안전**: 자살/자해를 유도하거나 암시하는 내용 절대 금지

## 출력 형식
반드시 JSON만 출력하세요. 다른 텍스트 없이 순수 JSON만.

\`\`\`json
{
  "questions": [
    {
      "id": "q{N}",
      "text": "(최대 80자)",
      "choices": [
        {
          "id": 1,
          "text": "(최대 60자)",
          "feedback": "(최대 40자)",
          "emotionLabel": "감정 라벨",
          "scores": { "burnout": 0, "guilt": 0, "identity_loss": 0, "loneliness": 0, "hope": 0 }
        }
      ]
    }
  ]
}
\`\`\``;

/* ══════════════════════════════════════════════════════
   5. Phase별 유저 프롬프트 빌더
   ══════════════════════════════════════════════════════ */

function buildPhaseContext(input: PhaseTransitionInput): string {
  const { targetPhase, accumulatedScores, previousResponses } = input;

  const scoresSummary = `현재 누적 감정 프로필:
  - 소진(burnout): ${accumulatedScores.burnout}
  - 죄책감(guilt): ${accumulatedScores.guilt}
  - 자기상실(identity_loss): ${accumulatedScores.identity_loss}
  - 외로움(loneliness): ${accumulatedScores.loneliness}
  - 희망(hope): ${accumulatedScores.hope}`;

  const responseSummary = previousResponses
    .map((r) => `  ${r.questionId}: "${r.choiceText}"`)
    .join('\n');

  return `${scoresSummary}\n\n이전 응답:\n${responseSummary}`;
}

const PHASE_DIRECTIVES: Record<number, string> = {
  2: `## Phase 2 (감정의 문) — q5~q8
일상에서 감정으로 전환. 자연스러운 감정 인식을 유도합니다.
- 구체적 일상 장면에서 감정 반응을 선택하게 하세요
- "요즘 이런 적 있으신가요?" 톤
- 방어기제를 세우지 않도록 부드럽고 간접적으로`,

  3: `## Phase 3 (깊은 숲) — q9~q12
깊은 감정 탐색. 취약한 감정(죄책감, 소진, 자기상실)에 접근합니다.
- 현재 누적 스코어에서 높은 차원을 더 깊이 탐색
- "사실은..." "혼자만 느끼는..." 톤
- 말 못하는 감정도 안전하게 선택 가능하도록`,

  4: `## Phase 4 (심연) — q13~q16
핵심 감정에 도달. 모든 선택지에 정상화가 내장되어야 합니다.
- 가장 깊은 곳의 감정을 다루되, 모든 선택지가 "그럴 수 있다"는 메시지
- "아무에게도 말하지 못했던..." 톤
- 감정의 바닥에서 작은 빛(hope)도 함께 포함`,

  5: `## Phase 5 (새벽빛) — q17~q19 + q20 프롬프트
희망과 통합으로의 전환. 3개 선택형 질문 + 1개 서술형(q20) 프롬프트를 생성합니다.
- 앞선 감정을 인정하면서도 희망의 실마리를 탐색
- "만약 괜찮아진다면..." "작은 빛이 보인다면..." 톤
- q20_prompt: 엄마에게 마지막으로 하고 싶은 이야기를 초대하는 문구

출력 형식이 다릅니다:
\`\`\`json
{
  "questions": [q17, q18, q19],
  "q20_prompt": {
    "title": "마지막 이야기",
    "instruction": "(AI가 생성한 개인화된 초대 문구, 50-100자)",
    "placeholder": "한 줄이라도 좋아요. 당신의 이야기를 들려주세요.",
    "skip_text": "건너뛰기"
  }
}
\`\`\``,
};

export function buildPhaseTransitionUserPrompt(input: PhaseTransitionInput): string {
  const context = buildPhaseContext(input);
  const directive = PHASE_DIRECTIVES[input.targetPhase];

  const questionRange = getQuestionRange(input.targetPhase);

  return `${directive}

${context}

질문 ID는 ${questionRange}을 사용하세요.
반드시 JSON만 출력하세요.`;
}

function getQuestionRange(targetPhase: number): string {
  switch (targetPhase) {
    case 2: return 'q5, q6, q7, q8';
    case 3: return 'q9, q10, q11, q12';
    case 4: return 'q13, q14, q15, q16';
    case 5: return 'q17, q18, q19';
    default: return '';
  }
}

/* ══════════════════════════════════════════════════════
   6. Few-shot 예시 (Phase 2 전환)
   ══════════════════════════════════════════════════════ */

export const FEW_SHOT_PHASE2: PhaseTransitionOutput = {
  questions: [
    {
      id: 'q5',
      text: '아이가 잠든 후, 혼자만의 시간이 생기면 가장 먼저 드는 생각은요?',
      choices: [
        {
          id: 1,
          text: '오늘 하루도 겨우 끝냈다는 안도감이요',
          feedback: '하루하루가 버거울 수 있어요',
          emotionLabel: '소진감',
          scores: { burnout: 70, guilt: 20, identity_loss: 30, loneliness: 20, hope: 15 },
        },
        {
          id: 2,
          text: '오늘 아이에게 화낸 게 자꾸 떠올라요',
          feedback: '그만큼 잘하고 싶은 마음이에요',
          emotionLabel: '죄책감',
          scores: { burnout: 30, guilt: 75, identity_loss: 20, loneliness: 15, hope: 20 },
        },
        {
          id: 3,
          text: '예전의 나는 어디 갔을까 싶어요',
          feedback: '그 마음, 자연스러운 거예요',
          emotionLabel: '자기상실',
          scores: { burnout: 25, guilt: 15, identity_loss: 75, loneliness: 35, hope: 15 },
        },
        {
          id: 4,
          text: '누구한테 이 얘기를 하면 좋을지 모르겠어요',
          feedback: '말할 곳이 없으면 더 무거워지죠',
          emotionLabel: '외로움',
          scores: { burnout: 20, guilt: 15, identity_loss: 25, loneliness: 75, hope: 20 },
        },
      ],
    },
    {
      id: 'q6',
      text: '요즘 거울을 볼 때 어떤 느낌이 드시나요?',
      choices: [
        {
          id: 1,
          text: '피곤한 얼굴만 보여서 빨리 지나쳐요',
          feedback: '쉴 틈이 없었죠',
          emotionLabel: '소진',
          scores: { burnout: 65, guilt: 15, identity_loss: 40, loneliness: 15, hope: 20 },
        },
        {
          id: 2,
          text: '이 사람이 정말 나인가 싶을 때가 있어요',
          feedback: '낯선 느낌이 드는 거죠',
          emotionLabel: '정체성 혼란',
          scores: { burnout: 30, guilt: 20, identity_loss: 70, loneliness: 25, hope: 15 },
        },
        {
          id: 3,
          text: '더 잘해야 하는데… 하는 생각이 먼저 들어요',
          feedback: '자기에게 엄격한 분이시네요',
          emotionLabel: '완벽주의',
          scores: { burnout: 45, guilt: 65, identity_loss: 30, loneliness: 15, hope: 20 },
        },
        {
          id: 4,
          text: '거울 볼 시간도 없이 하루가 가요',
          feedback: '정말 바쁘신 거예요',
          emotionLabel: '일상의 압도',
          scores: { burnout: 70, guilt: 25, identity_loss: 35, loneliness: 20, hope: 15 },
        },
      ],
    },
    {
      id: 'q7',
      text: '주변 엄마들의 SNS를 보면 어떤 마음이 드시나요?',
      choices: [
        {
          id: 1,
          text: '다들 잘하는 것 같아서 작아지는 느낌이에요',
          feedback: '비교하게 되는 건 자연스러워요',
          emotionLabel: '사회적 비교',
          scores: { burnout: 35, guilt: 45, identity_loss: 50, loneliness: 40, hope: 15 },
        },
        {
          id: 2,
          text: '저렇게 여유 있는 게 부러워요',
          feedback: '여유가 그리우시죠',
          emotionLabel: '소진 인식',
          scores: { burnout: 60, guilt: 20, identity_loss: 30, loneliness: 35, hope: 20 },
        },
        {
          id: 3,
          text: '보지 않으려고 해요. 마음이 복잡해져서',
          feedback: '자기를 보호하는 방법이에요',
          emotionLabel: '회피',
          scores: { burnout: 45, guilt: 35, identity_loss: 40, loneliness: 50, hope: 15 },
        },
        {
          id: 4,
          text: '별 느낌 없어요. 남의 일 같아서',
          feedback: '거리를 두고 계시네요',
          emotionLabel: '감정적 거리',
          scores: { burnout: 40, guilt: 15, identity_loss: 55, loneliness: 30, hope: 25 },
        },
      ],
    },
    {
      id: 'q8',
      text: '하루 중 가장 길게 느껴지는 시간은 언제인가요?',
      choices: [
        {
          id: 1,
          text: '아이가 떼쓰기 시작할 때요',
          feedback: '그 순간이 정말 길게 느껴지죠',
          emotionLabel: '소진의 순간',
          scores: { burnout: 70, guilt: 30, identity_loss: 15, loneliness: 15, hope: 20 },
        },
        {
          id: 2,
          text: '밤에 혼자 깨어 있는 시간이요',
          feedback: '고요한 밤이 더 외로울 수 있어요',
          emotionLabel: '야간 고독',
          scores: { burnout: 35, guilt: 20, identity_loss: 30, loneliness: 70, hope: 15 },
        },
        {
          id: 3,
          text: '남편이 퇴근하기 전까지요',
          feedback: '기다리는 시간이 길죠',
          emotionLabel: '지원 부재',
          scores: { burnout: 55, guilt: 15, identity_loss: 20, loneliness: 55, hope: 25 },
        },
        {
          id: 4,
          text: '하루 전체가 다 길게 느껴져요',
          feedback: '정말 힘든 시기이시네요',
          emotionLabel: '전반적 무기력',
          scores: { burnout: 65, guilt: 35, identity_loss: 45, loneliness: 40, hope: 10 },
        },
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════
   7. 에러 핸들링 설정
   ══════════════════════════════════════════════════════ */

export const ERROR_HANDLING = {
  /** JSON 파싱 실패 → 1회 재시도 (temp 0.5) */
  jsonParseRetry: true,
  /** Zod 검증 실패 → 에러 메시지 포함 1회 재시도 */
  zodRetryWithError: true,
  /** 2회 실패 → 반개인화 폴백 */
  fallbackAfterRetries: 2,
  /** 429 에러 → exponential backoff */
  backoffBase: 3_000,
  backoffMultiplier: 2,
  /** 타임아웃 → 반개인화 폴백 */
  timeoutMs: 15_000,
  /** LLM 호출 로그 소스 */
  logSource: 'tq_phase_transition',
} as const;

/* ══════════════════════════════════════════════════════
   8. 인터스티셜 설정
   ══════════════════════════════════════════════════════ */

export const INTERSTITIAL_CONFIG = {
  /** 최소 표시 시간 (AI 응답보다 짧아도 이만큼은 표시) */
  minDisplayMs: 2_000,
  messages: [
    '당신의 이야기가 숲 속으로 들어가고 있어요...',
    '문이 열리고 있어요...',
    '다음 이야기를 준비하고 있어요...',
  ] as const,
  /** Phase 2 진입 시 추가 메시지 */
  phase2Extra: '벌써 절반이에요!',
  /** 문 열림 애니메이션 시간 (ms) */
  doorAnimationMs: 2_000,
} as const;
