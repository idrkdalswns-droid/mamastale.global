/**
 * Character card worksheet activity prompt module.
 * Based on Theory of Mind development and social cognition research.
 *
 * @module worksheet/prompts/activities/character-card
 */

export const CHARACTER_CARD_ACTIVITY_MODULE = `## 활동지 유형: 등장인물 카드
누리과정 영역: 사회관계 (나와 다른 사람의 감정 알기, 더불어 생활하기)

### 교육학적 근거
- 마음이론(Theory of Mind): 4세 전후 타인의 생각/감정을 추론하는 능력 발달
- 누리과정 "사회관계": 나와 다른 사람의 감정 차이를 안다, 친구와 사이좋게 지낸다
- 캐릭터 분석은 사회적 인지(social cognition)의 핵심 훈련
- 카드 형태는 정보를 구조화하여 이해력을 높이고 비교/대조를 촉진

### 생성 규칙
1. 동화의 주요 등장인물 1~4명을 선택하여 characters에 포함하세요.
2. 각 캐릭터의 name, role, appearance, personality, favorite_thing, emotion_keyword를 작성하세요.
3. drawing_prompt는 유아가 캐릭터를 그릴 수 있는 구체적 안내입니다.
4. relationship은 다른 캐릭터와의 관계를 설명합니다 (2명 이상일 때).
5. comparison_question은 캐릭터를 비교하는 질문입니다 (2명 이상일 때).
6. 만3세는 1~2명, 만4세는 2~3명, 만5세는 2~4명이 적합합니다.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 등장인물 카드",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "사회관계",
  "characters": [
    {
      "name": "이름 (50자 이내)",
      "role": "역할 (30자 이내)",
      "appearance": "외모 설명 (150자 이내)",
      "personality": ["성격1", "성격2"],
      "favorite_thing": "좋아하는 것 (100자 이내)",
      "emotion_keyword": "감정 키워드 (30자 이내)",
      "relationship": "관계 설명 (100자 이내, 선택)",
      "drawing_prompt": "그리기 안내 (150자 이내)"
    }
  ],
  "comparison_question": "비교 질문 (200자 이내, 선택)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "사회관계"여야 합니다.`;

/** Content focus sub-modules for character card worksheet */
export const CHARACTER_CARD_CONTENT_FOCUS: Record<string, string> = {
  single_deep: `### 콘텐츠 초점: 한 캐릭터 깊이 탐색
주인공 1명에 대해 깊이 있게 탐색합니다.
외모, 성격, 감정, 좋아하는 것 등을 상세히 분석합니다.
"이 친구는 어떤 사람일까?" 관점에서 캐릭터를 이해하는 활동입니다.`,

  multi_compare: `### 콘텐츠 초점: 여러 캐릭터 비교
2~4명의 캐릭터를 비교·대조하는 활동입니다.
각 캐릭터의 공통점과 차이점을 발견하도록 안내합니다.
comparison_question 필드에 비교 질문을 반드시 포함하세요.`,

  my_character: `### 콘텐츠 초점: 나만의 캐릭터
동화 속 캐릭터를 참고하여 자신만의 캐릭터를 만드는 활동입니다.
기존 캐릭터 1명의 카드를 만든 후, 빈 카드에 자기 자신이나 상상 캐릭터를 그립니다.
"나는 어떤 사람일까?"를 탐색하는 자기인식 활동과 연결됩니다.`,
};

/** Output style sub-modules for character card worksheet */
export const CHARACTER_CARD_OUTPUT_STYLE: Record<string, string> = {
  drawing_card: `### 출력 스타일: 그리기 카드
캐릭터 얼굴/모습을 크게 그리는 카드입니다.
drawing_prompt를 구체적으로 설정하세요.
그리기 공간을 넓게, 텍스트 정보는 간결하게 구성합니다.`,

  info_card: `### 출력 스타일: 정보 카드
캐릭터 정보를 구조화한 프로필 카드입니다.
이름, 역할, 성격, 좋아하는 것 등을 항목별로 정리합니다.
작은 그리기 공간과 함께 읽기/쓰기 활동을 포함합니다.`,

  trading_card: `### 출력 스타일: 트레이딩 카드
게임 카드 형태로 캐릭터를 표현합니다.
캐릭터의 "능력치"나 "특기"를 재미있게 표현합니다.
아이들이 카드를 오려서 모을 수 있도록 구성합니다.`,
};
