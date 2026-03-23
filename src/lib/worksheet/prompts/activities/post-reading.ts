/**
 * Post-reading worksheet activity prompt module.
 * Based on Bloom's Taxonomy and reader response theory.
 *
 * @module worksheet/prompts/activities/post-reading
 */

export const POST_READING_ACTIVITY_MODULE = `## 활동지 유형: 독후활동지
누리과정 영역: 의사소통 (듣기와 말하기, 읽기와 쓰기에 관심 가지기)

### 교육학적 근거
- 블룸 택소노미: 이해(Level 2) → 감상(Level 3-4) → 창의확장(Level 5-6)
- 서사적 그리기(narrative drawing)가 읽기 준비도를 촉진
- 그림은 글보다 추상성이 낮아 만3세의 주된 의미 전달 수단

### 생성 규칙
1. comprehension_questions: 이야기 내용을 확인하는 질문 (회상, 추론, 의견)
2. drawing_prompt: 그리기 영역 안내 ("가장 기억에 남는 장면을 그려보세요" 등)
3. writing_prompt: 쓰기 영역 안내 ("○○이에게 하고 싶은 말을 적어보세요" 등)
4. creative_extension: 만5세용 확장 활동 (선택사항)
5. 질문은 정답이 없는 열린 질문을 포함하세요.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 독후활동지",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "의사소통",
  "comprehension_questions": [
    { "question": "질문 내용 (100자 이내)", "type": "recall" },
    { "question": "질문 내용", "type": "inference" },
    { "question": "질문 내용", "type": "opinion" }
  ],
  "drawing_prompt": "그리기 안내 (100자 이내)",
  "writing_prompt": "쓰기 안내 (100자 이내)",
  "creative_extension": "확장 활동 (100자 이내, 선택)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "의사소통"이어야 합니다.
⚠️ type은 반드시 "recall", "inference", "opinion" 중 하나여야 합니다.`;

/** Content focus sub-modules */
export const POST_READING_CONTENT_FOCUS: Record<string, string> = {
  comprehension: `### 콘텐츠 초점: 이해 (내용 되짚기)
이야기의 핵심 내용을 되짚어보는 활동입니다.
"누가 나왔나요?", "무슨 일이 일어났나요?" 유형의 회상(recall) 질문을 중심으로 구성하세요.
정답이 있는 질문과 추론 질문을 섞어 구성합니다.`,

  appreciation: `### 콘텐츠 초점: 감상 (느낌 표현)
이야기를 읽고 느낀 감정과 생각을 표현하는 활동입니다.
"어떤 장면이 가장 기억에 남나요?", "○○이의 기분은 어땠을까?" 유형의 질문입니다.
개인적 정서 반응을 이끌어내어 독서치료의 '통찰' 단계와 연결합니다.`,

  creative: `### 콘텐츠 초점: 창의확장 (상상)
이야기에서 출발하여 새로운 상상으로 확장하는 활동입니다.
"이야기의 뒷이야기를 상상해보세요", "○○이에게 편지를 써보세요" 유형입니다.
creative_extension 필드에 만5세용 추가 활동을 포함하세요.`,
};

/** Output style sub-modules */
export const POST_READING_OUTPUT_STYLE: Record<string, string> = {
  drawing_heavy: `### 출력 스타일: 그리기 중심 (90:10)
대부분 그림으로 표현하는 활동입니다.
drawing_prompt를 구체적으로, writing_prompt는 이름/한 단어 수준으로 설정하세요.
만3세에게 적합합니다.`,

  balanced: `### 출력 스타일: 반반 (50:50)
그리기와 쓰기를 균형 있게 구성합니다.
drawing_prompt와 writing_prompt를 동일한 비중으로 설정하세요.
만4세에게 적합합니다.`,

  writing_heavy: `### 출력 스타일: 쓰기 중심 (30:70)
생각을 글로 표현하는 활동입니다.
writing_prompt를 구체적으로, drawing_prompt는 작은 삽화 영역으로 설정하세요.
만5세에게 적합합니다.`,
};
