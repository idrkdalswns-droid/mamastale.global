/**
 * 선생님 모드 — 연령별 하드 가드레일
 * picturebook-agents/3-text-writer 기반
 */

export interface AgeGuardrails {
  ageGroup: string;
  label: string;
  totalWords: { min: number; max: number };
  wordsPerSpread: { min: number; max: number };
  sentenceSyllables: { min: number; max: number };
  sentenceType: string;
  onomatopoeiaRatio: string;
  repetitionPattern: string;
  dialogueRatio: string;
  characterCount: { min: number; max: number };
  causalChain: string;
  headToBodyRatio: string;
  colorCount: { min: number; max: number };
  outlineWeight: string;
}

export const AGE_GUARDRAILS: Record<string, AgeGuardrails> = {
  infant: {
    ageGroup: "infant",
    label: "영아 (0~2세)",
    totalWords: { min: 50, max: 100 },
    wordsPerSpread: { min: 1, max: 8 },
    sentenceSyllables: { min: 1, max: 5 },
    sentenceType: "단어 또는 구",
    onomatopoeiaRatio: "50% 이상",
    repetitionPattern: "80% 이상 동일 반복",
    dialogueRatio: "0%",
    characterCount: { min: 1, max: 2 },
    causalChain: "1단계",
    headToBodyRatio: "1:1~1:1.5",
    colorCount: { min: 2, max: 3 },
    outlineWeight: "극굵기 (4~6pt)",
  },
  toddler: {
    ageGroup: "toddler",
    label: "유아 (3~4세)",
    totalWords: { min: 400, max: 600 },
    wordsPerSpread: { min: 20, max: 45 },
    sentenceSyllables: { min: 5, max: 15 },
    sentenceType: "단문 + 일부 복문",
    onomatopoeiaRatio: "20~30%",
    repetitionPattern: "50~70% 변주 반복",
    dialogueRatio: "30~50%",
    characterCount: { min: 1, max: 3 },
    causalChain: "2~3단계",
    headToBodyRatio: "1:1.5~1:2",
    colorCount: { min: 4, max: 6 },
    outlineWeight: "굵기 (2~4pt)",
  },
  kindergarten: {
    ageGroup: "kindergarten",
    label: "유치 (5~7세)",
    totalWords: { min: 600, max: 1000 },
    wordsPerSpread: { min: 30, max: 70 },
    sentenceSyllables: { min: 8, max: 25 },
    sentenceType: "단문·복문 혼합",
    onomatopoeiaRatio: "10~20%",
    repetitionPattern: "20~40% 모티프 반복",
    dialogueRatio: "40~60%",
    characterCount: { min: 3, max: 6 },
    causalChain: "4단계 이상",
    headToBodyRatio: "1:2~1:3",
    colorCount: { min: 7, max: 10 },
    outlineWeight: "중간~얇기 (1~3pt)",
  },
  mixed: {
    ageGroup: "mixed",
    label: "혼합연령",
    totalWords: { min: 300, max: 500 },
    wordsPerSpread: { min: 15, max: 35 },
    sentenceSyllables: { min: 5, max: 15 },
    sentenceType: "단문 위주 + 간단한 복문",
    onomatopoeiaRatio: "25~35%",
    repetitionPattern: "60~70% 변주 반복",
    dialogueRatio: "20~40%",
    characterCount: { min: 1, max: 3 },
    causalChain: "2단계",
    headToBodyRatio: "1:1.5~1:2",
    colorCount: { min: 3, max: 5 },
    outlineWeight: "굵기 (2~4pt)",
  },
};

/** 서사 구조 적합성 매트릭스 */
export const NARRATIVE_STRUCTURE_MATRIX: Record<
  string,
  Record<string, number>
> = {
  반복: { infant: 3, toddler: 2, kindergarten: 1 },
  일상서사: { infant: 3, toddler: 2, kindergarten: 1 },
  누적: { infant: 1, toddler: 3, kindergarten: 3 },
  원형: { infant: 0, toddler: 3, kindergarten: 3 },
  "문제-해결": { infant: 0, toddler: 2, kindergarten: 3 },
  점층: { infant: 0, toddler: 2, kindergarten: 3 },
};

/** 연령별 허용 어휘 카테고리 */
export const VOCABULARY_LEVELS: Record<string, string[]> = {
  infant: [
    "명사: 엄마, 아빠, 아기, 멍멍이, 공, 밥, 달, 별, 꽃, 물, 나무",
    "동사: 먹다, 자다, 울다, 웃다, 가다, 보다, 안다, 잡다",
    "형용사: 크다, 작다, 예쁘다",
    "의성어: 냠냠, 쿨쿨, 멍멍, 야옹, 까꿍, 짝짝짝",
  ],
  toddler: [
    "감정: 기쁘다, 슬프다, 화나다, 무섭다, 좋아하다",
    "관계: 친구, 함께, 나누다, 도와주다, 미안하다, 고마워",
    "동작: 달리다, 뛰다, 숨다, 찾다, 만들다, 놀다, 그리다",
    "자연: 비, 바람, 해, 구름, 나비, 개미",
  ],
  kindergarten: [
    "복합감정: 자랑스럽다, 설레다, 서운하다, 부끄럽다",
    "추상: 용기, 약속, 비밀, 모험, 꿈, 우정",
    "비유: ~처럼, ~만큼, 마치 ~같은",
    "시간: 옛날옛날, 어느 날, 드디어, 갑자기",
    "논리: 그래서, 하지만, 왜냐하면, 만약에",
  ],
};

export function getAgeGuardrails(ageGroup: string): AgeGuardrails {
  return AGE_GUARDRAILS[ageGroup] || AGE_GUARDRAILS.toddler;
}

export function formatGuardrailsForPrompt(guardrails: AgeGuardrails): string {
  return `## 연령별 하드 가드레일 [${guardrails.label}]

| 파라미터 | 값 |
|---------|-----|
| 총 단어 수 | ${guardrails.totalWords.min}~${guardrails.totalWords.max} |
| 스프레드당 단어 | ${guardrails.wordsPerSpread.min}~${guardrails.wordsPerSpread.max} |
| 문장 길이(음절) | ${guardrails.sentenceSyllables.min}~${guardrails.sentenceSyllables.max} |
| 문장 유형 | ${guardrails.sentenceType} |
| 의성어·의태어 비율 | ${guardrails.onomatopoeiaRatio} |
| 반복 패턴 | ${guardrails.repetitionPattern} |
| 대화 비율 | ${guardrails.dialogueRatio} |
| 캐릭터 수 | ${guardrails.characterCount.min}~${guardrails.characterCount.max} |
| 인과 사슬 | ${guardrails.causalChain} |

이 파라미터는 절대 가드레일입니다. 초과하면 발달 부적합 판정됩니다.`;
}
