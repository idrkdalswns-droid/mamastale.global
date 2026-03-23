/**
 * What-If worksheet activity prompt module.
 * Based on Hoffman's empathic development, Piaget's decentration,
 * and bibliotherapy identification.
 *
 * @module worksheet/prompts/activities/what-if
 */

export const WHAT_IF_ACTIVITY_MODULE = `## 활동지 유형: 나라면? 상상 활동지
누리과정 영역: 사회관계 (나를 알고 존중하기, 더불어 생활하기)

### 교육학적 근거
- Hoffman 공감 발달: 자기중심적 공감 → 타인 지향 공감 (만3~5세 전환기)
- Piaget 탈중심화: 타인의 관점에서 생각하기 (전조작기 후기)
- 독서치료 동일시(identification): 캐릭터와 자신을 동일시하며 감정 이입

### 생성 규칙
1. 동화에서 캐릭터가 선택/갈등/관계적 상황에 놓인 장면을 scenario로 추출하세요.
2. scenario.dilemma에는 "○○이는 어떻게 해야 할까?" 유형의 딜레마를 제시합니다.
3. perspective_questions에 유아가 캐릭터 입장에서 생각해볼 질문 2~5개를 만드세요.
4. 질문 type: feeling(감정 탐색), action(행동 선택), empathy(공감), creative(창의적 상상)
5. drawing_prompt는 "내가 ○○라면 어떤 모습일까?" 유형의 그리기 안내입니다.
6. my_story_prompt는 만5세용 확장 쓰기 활동입니다 (선택).

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 나라면? 상상 활동지",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "사회관계",
  "scenario": {
    "scene_summary": "장면 요약 (200자 이내)",
    "character": "캐릭터 이름 (50자 이내)",
    "dilemma": "딜레마 상황 설명 (200자 이내)"
  },
  "perspective_questions": [
    { "question": "질문 내용 (200자 이내)", "type": "feeling" },
    { "question": "질문 내용", "type": "action" },
    { "question": "질문 내용", "type": "empathy" }
  ],
  "drawing_prompt": "그리기 안내 (200자 이내)",
  "my_story_prompt": "나만의 이야기 쓰기 안내 (200자 이내, 선택)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "사회관계"여야 합니다.
⚠️ perspective_questions의 type은 반드시 "feeling", "action", "empathy", "creative" 중 하나여야 합니다.`;

/** Content focus sub-modules for what-if worksheet */
export const WHAT_IF_CONTENT_FOCUS: Record<string, string> = {
  conflict_moment: `### 콘텐츠 초점: 갈등 장면
캐릭터가 갈등 상황에 놓인 장면을 선택합니다.
"○○이는 왜 그런 선택을 했을까?", "나라면 어떻게 했을까?" 유형의 질문을 만드세요.
갈등의 원인과 해결 과정을 탐색하며 문제해결 능력을 키웁니다.`,

  choice_moment: `### 콘텐츠 초점: 선택의 순간
캐릭터가 중요한 선택을 해야 하는 장면에 초점을 맞춥니다.
"두 가지 길 중 어디로 갈까?", "나라면 무엇을 골랐을까?" 유형의 질문입니다.
선택의 결과를 상상해보며 인과관계를 이해합니다.`,

  relationship_moment: `### 콘텐츠 초점: 관계 장면
캐릭터 간의 관계가 드러나는 장면을 선택합니다.
"○○이의 마음을 △△이는 알았을까?", "나라면 친구에게 뭐라고 말할까?" 유형입니다.
타인의 감정과 입장을 이해하며 사회적 기술을 연습합니다.`,
};

/** Output style sub-modules for what-if worksheet */
export const WHAT_IF_OUTPUT_STYLE: Record<string, string> = {
  drawing_imagine: `### 출력 스타일: 상상 그리기
"내가 ○○라면 어떤 모습일까?" 그리기 중심 활동입니다.
drawing_prompt를 구체적으로 설정하고, 그리기 공간을 넓게 배치하세요.
만3~4세에게 적합합니다.`,

  question_deep: `### 출력 스타일: 깊은 질문 중심
perspective_questions를 4~5개로 풍부하게 구성합니다.
각 질문 아래 쓰기 라인을 배치하여 생각을 표현할 수 있게 합니다.
만4~5세에게 적합합니다.`,

  story_extend: `### 출력 스타일: 이야기 확장
my_story_prompt를 반드시 포함하여 "그다음에 어떤 일이 일어났을까?" 유형의 이야기 확장 활동을 구성합니다.
그리기 + 쓰기 복합 활동으로, 만5세에게 적합합니다.`,
};
