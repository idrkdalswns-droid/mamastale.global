/**
 * Vocabulary worksheet activity prompt module.
 * Based on emergent literacy and vocabulary acquisition research.
 *
 * @module worksheet/prompts/activities/vocabulary
 */

export const VOCABULARY_ACTIVITY_MODULE = `## 활동지 유형: 낱말 탐험
누리과정 영역: 의사소통 (듣기와 말하기, 읽기와 쓰기에 관심 가지기)

### 교육학적 근거
- 어휘 습득 이론: 맥락 속 어휘 학습(incidental vocabulary learning)이 가장 효과적
- 누리과정 "의사소통": 새로운 낱말에 관심을 가진다, 말의 재미를 느낀다
- 동화 속 어휘를 시각화(그림)·맥락화(예문)·조작(퍼즐)으로 다층 인코딩
- Nation의 어휘 지식 프레임워크: 형태(form) → 의미(meaning) → 사용(use)

### 생성 규칙
1. 동화에서 유아에게 의미 있는 낱말 3~8개를 선택하여 words에 포함하세요.
2. 각 낱말에 meaning(뜻 풀이), example_sentence(동화 맥락 예문), drawing_hint(그림 힌트)를 작성하세요.
3. category는 "emotion_word", "action_word", "noun", "adjective", "onomatopoeia" 중 선택하세요.
4. word_puzzle은 선택사항이며, 간단한 낱말 퍼즐을 제공할 때 사용합니다.
5. writing_practice_word는 선택사항이며, 직접 써보기 연습용 낱말입니다.
6. 만3세는 3~4개, 만4세는 4~6개, 만5세는 5~8개 낱말이 적합합니다.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 낱말 탐험 활동지",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "의사소통",
  "words": [
    {
      "word": "낱말 (20자 이내)",
      "meaning": "뜻 풀이 (100자 이내)",
      "example_sentence": "예문 (150자 이내)",
      "category": "emotion_word",
      "drawing_hint": "그림 힌트 (100자 이내)"
    }
  ],
  "word_puzzle": {
    "type": "matching",
    "question": "퍼즐 질문 (200자 이내)",
    "items": ["항목1", "항목2"]
  },
  "writing_practice_word": "써보기 낱말 (20자 이내, 선택)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "의사소통"이어야 합니다.
⚠️ category는 반드시 "emotion_word", "action_word", "noun", "adjective", "onomatopoeia" 중 하나여야 합니다.`;

/** Content focus sub-modules for vocabulary worksheet */
export const VOCABULARY_CONTENT_FOCUS: Record<string, string> = {
  emotion_words: `### 콘텐츠 초점: 감정 낱말
동화에 등장하는 감정 표현 낱말에 집중합니다.
"기쁘다", "슬프다" 같은 기본 감정뿐 아니라 "두근두근", "시무룩" 등 풍부한 감정어를 탐색합니다.
감정 낱말을 얼굴 표정이나 몸짓으로 연결하는 활동을 포함하세요.`,

  action_words: `### 콘텐츠 초점: 동작 낱말
동화에 등장하는 동작/행동 낱말에 집중합니다.
"뛰다", "안다", "숨다" 등 캐릭터의 행동을 나타내는 낱말을 탐색합니다.
몸으로 동작을 따라하며 낱말을 익히는 활동을 포함하세요.`,

  story_key_words: `### 콘텐츠 초점: 이야기 핵심 낱말
동화의 주제와 줄거리를 이해하는 데 핵심적인 낱말을 선택합니다.
명사, 형용사, 의성어/의태어 등 다양한 품사를 포함합니다.
낱말의 소리, 모양, 뜻을 다각도로 탐색하세요.`,
};

/** Output style sub-modules for vocabulary worksheet */
export const VOCABULARY_OUTPUT_STYLE: Record<string, string> = {
  explore: `### 출력 스타일: 탐색 중심
낱말 카드 형태로 낱말의 뜻, 예문, 그림 힌트를 제공합니다.
각 낱말을 그림으로 표현하는 공간을 넓게 할당하세요.
만3세에게 적합한 시각 중심 탐색 활동입니다.`,

  puzzle: `### 출력 스타일: 퍼즐 중심
낱말 퍼즐(짝짓기, 빈칸 채우기 등)을 중심으로 구성합니다.
word_puzzle 필드에 퍼즐 유형과 문제를 반드시 포함하세요.
놀이처럼 즐기면서 낱말을 익히는 활동입니다.`,

  writing: `### 출력 스타일: 쓰기 중심
낱말을 직접 써보는 활동을 중심으로 구성합니다.
writing_practice_word 필드에 연습용 낱말을 반드시 포함하세요.
만5세의 쓰기 준비도를 높이는 활동입니다.`,
};
