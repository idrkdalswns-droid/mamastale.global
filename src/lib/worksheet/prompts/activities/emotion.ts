/**
 * Emotion worksheet activity prompt module.
 * Based on Gottman's emotion coaching, CASEL SEL framework,
 * and Hynes & Hynes-Berry interactive bibliotherapy.
 *
 * @module worksheet/prompts/activities/emotion
 */

export const EMOTION_ACTIVITY_MODULE = `## 활동지 유형: 감정 활동지
누리과정 영역: 사회관계 (감정 인식 및 표현)

### 교육학적 근거
- Gottman 감정 코칭: 감정 인식 → 연결 기회 → 공감적 경청 → 감정 명명
- CASEL SEL: 자기인식(자신의 감정), 사회적 인식(타인의 감정)
- 독서치료: 동일시(identification) → 카타르시스 → 통찰

### 생성 규칙
1. 동화에서 캐릭터가 강한 감정을 느끼는 장면을 찾아 emotion_scenes에 포함하세요.
2. 각 장면에 대해 유아가 감정을 탐색할 수 있는 질문을 만드세요.
3. emotion_icons에 이 동화에 등장하는 주요 감정 4~8개를 나열하세요.
4. 질문은 "~했을까?", "~느꼈을까?" 형태의 열린 질문이어야 합니다.
5. body_mapping_prompt는 "몸에서 이 감정이 어디에서 느껴지나요?" 유형의 안내입니다.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 감정 탐색 활동지",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "사회관계",
  "emotion_scenes": [
    {
      "scene_summary": "장면 요약 (100자 이내)",
      "emotion": "감정 이름 (20자 이내)",
      "character": "캐릭터 이름 (30자 이내)",
      "question": "유아용 질문 (80자 이내)"
    }
  ],
  "emotion_icons": [
    { "emotion": "기쁨", "label": "기뻐요" },
    { "emotion": "슬픔", "label": "슬퍼요" },
    { "emotion": "화남", "label": "화나요" },
    { "emotion": "두려움", "label": "무서워요" }
  ],
  "body_mapping_prompt": "이 감정이 몸 어디에서 느껴지나요? (100자 이내)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "사회관계"여야 합니다.`;

/** Content focus sub-modules for emotion worksheet */
export const EMOTION_CONTENT_FOCUS: Record<string, string> = {
  specific_emotion: `### 콘텐츠 초점: 특정 감정 장면
주인공이 가장 강한 감정을 느끼는 1~2개 장면에 집중합니다.
"○○이는 이때 어떤 기분이었을까?" 유형의 구체적 질문을 만드세요.`,

  emotion_change: `### 콘텐츠 초점: 감정 변화 (전→후)
주인공의 감정이 변화하는 과정에 초점을 맞춥니다.
"처음에는 어떤 기분이었을까? → 나중에는 어떻게 바뀌었을까?" 흐름을 보여주세요.
감정의 원인과 결과를 탐색하며 감정 조절을 모델링합니다.`,

  emotion_flow: `### 콘텐츠 초점: 전체 감정 흐름
이야기 전체를 따라가며 주인공의 감정선을 추적합니다.
3~5개 주요 장면을 선택하여 감정 여정을 보여주세요.
이야기 전체의 감정 변화를 한눈에 볼 수 있도록 합니다.`,
};

/** Output style sub-modules for emotion worksheet */
export const EMOTION_OUTPUT_STYLE: Record<string, string> = {
  drawing: `### 출력 스타일: 그리기 중심
감정을 얼굴 표정으로 그려보는 활동입니다.
빈 얼굴 틀에 감정에 맞는 표정을 그려넣도록 안내하세요.
그리기 공간을 넓게, 글씨 공간은 최소화합니다.`,

  matching: `### 출력 스타일: 선택하기 중심
감정 아이콘(텍스트 배지)과 장면을 매칭하는 활동입니다.
아이콘 목록을 제공하고, 각 장면에 맞는 감정을 골라 동그라미 치도록 합니다.
쓰기가 어려운 만3세에게 적합합니다.`,

  mixed: `### 출력 스타일: 쓰기+그리기 혼합
감정 아이콘을 선택한 후, 그 감정의 얼굴을 그려보는 복합 활동입니다.
선택하기 → 그리기 → (가능하면) 한 줄 쓰기 순서로 구성합니다.`,
};
