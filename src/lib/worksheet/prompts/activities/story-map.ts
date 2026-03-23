/**
 * Story map worksheet activity prompt module.
 * Based on narrative structure comprehension and story grammar research.
 *
 * @module worksheet/prompts/activities/story-map
 */

export const STORY_MAP_ACTIVITY_MODULE = `## 활동지 유형: 스토리맵
누리과정 영역: 의사소통 (듣기와 말하기, 읽기와 쓰기에 관심 가지기)

### 교육학적 근거
- Story Grammar 이론(Stein & Glenn): 배경→사건→반응→시도→결과→교훈 구조
- 누리과정 "의사소통": 이야기를 듣고 내용을 이해한다, 경험을 글로 표현한다
- 시각적 스토리맵은 서사 구조 이해를 돕고 이야기 재구성 능력을 발달시킴
- 순서 배열 활동은 시간 개념과 인과관계 사고력을 촉진

### 생성 규칙
1. 이야기를 3~5개 구간(phase)으로 나누어 phases에 포함하세요.
2. 각 phase에 phase_name(단계 이름), summary(요약), characters_involved(등장인물), drawing_prompt(그리기 안내)를 작성하세요.
3. emotion_tone은 해당 구간의 감정 분위기입니다.
4. connection_labels는 구간 사이 화살표에 표시할 연결어입니다 (선택).
5. 만3세는 3개, 만4세는 3~4개, 만5세는 4~5개 구간이 적합합니다.
6. phase_name은 "시작", "문제 발생", "해결", "끝" 등 간결하게 작성하세요.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 스토리맵",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "의사소통",
  "phases": [
    {
      "phase_name": "단계 이름 (30자 이내)",
      "summary": "요약 (200자 이내)",
      "characters_involved": ["캐릭터1", "캐릭터2"],
      "drawing_prompt": "그리기 안내 (150자 이내)",
      "emotion_tone": "감정 분위기 (30자 이내)"
    }
  ],
  "connection_labels": ["그래서", "그런데", "드디어"]
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "의사소통"이어야 합니다.`;

/** Content focus sub-modules for story map worksheet */
export const STORY_MAP_CONTENT_FOCUS: Record<string, string> = {
  simple_flow: `### 콘텐츠 초점: 간단한 흐름 (3단계)
시작 → 중간 → 끝의 3단계로 이야기를 정리합니다.
각 단계에서 가장 중요한 장면 하나를 그립니다.
만3세에게 적합한 간결한 구조입니다.`,

  four_parts: `### 콘텐츠 초점: 기승전결 (4단계)
기(시작) → 승(전개) → 전(위기) → 결(해결)로 이야기를 정리합니다.
각 단계의 핵심 사건을 요약하고 그림으로 표현합니다.
만4세에게 적합한 전형적인 서사 구조입니다.`,

  detailed: `### 콘텐츠 초점: 상세 흐름 (5단계)
도입 → 갈등 → 시도 → 해결 → 교훈의 5단계로 이야기를 분석합니다.
각 단계의 감정 변화와 인과관계를 탐색합니다.
만5세에게 적합한 심화 분석 활동입니다.`,
};

/** Output style sub-modules for story map worksheet */
export const STORY_MAP_OUTPUT_STYLE: Record<string, string> = {
  drawing_map: `### 출력 스타일: 그리기 맵
각 단계를 그림으로 표현하는 시각적 스토리맵입니다.
drawing_prompt를 구체적으로 설정하세요.
그리기 공간을 크게, 텍스트는 최소화합니다.`,

  text_map: `### 출력 스타일: 글쓰기 맵
각 단계를 글로 요약하는 스토리맵입니다.
summary를 읽고 핵심 내용을 직접 써보는 활동입니다.
만5세의 쓰기 활동에 적합합니다.`,

  sticker_map: `### 출력 스타일: 스티커 맵
빈 칸에 장면 스티커를 순서대로 붙이는 활동입니다.
각 phase의 drawing_prompt를 스티커 설명처럼 작성하세요.
순서 배열을 통해 서사 구조를 체험합니다.`,
};
