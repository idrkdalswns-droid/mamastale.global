/**
 * Coloring worksheet activity prompt module.
 * Based on Lowenfeld's stages of artistic development
 * and Nuri curriculum "예술적 표현하기".
 *
 * @module worksheet/prompts/activities/coloring
 */

export const COLORING_ACTIVITY_MODULE = `## 활동지 유형: 색칠놀이
누리과정 영역: 예술경험 (예술적 표현하기)

### 교육학적 근거
- Lowenfeld 미술 발달 단계: 난화기(2-4세) → 전도식기(4-7세) → 도식기(7-9세)
- 누리과정 "예술적 표현하기": 미술 활동으로 자신의 생각과 느낌을 표현한다
- 색칠 활동은 소근육 발달, 색채 인식, 정서 표현을 동시에 촉진
- 동화 속 장면 재현은 서사 이해력과 시각적 기억력을 강화

### 생성 규칙
1. 동화에서 색칠하기에 적합한 장면 1~3개를 선택하여 coloring_scenes에 포함하세요.
2. 각 장면에 대해 구체적인 scene_description(무엇을 색칠할지)을 작성하세요.
3. elements에 색칠할 개별 요소(캐릭터, 배경, 소품 등)를 나열하세요.
4. mood로 장면의 전체 분위기를 간결하게 표현하세요.
5. color_suggestion은 선택사항이며, 유아에게 색상 힌트를 줄 때 사용합니다.
6. free_drawing_prompt는 자유 그리기 안내 문구입니다.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 색칠놀이 활동지",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "예술경험",
  "coloring_scenes": [
    {
      "scene_description": "장면 설명 (200자 이내)",
      "elements": ["색칠할 요소1", "색칠할 요소2"],
      "mood": "장면 분위기 (30자 이내)"
    }
  ],
  "color_suggestion": "색상 힌트 (200자 이내, 선택)",
  "free_drawing_prompt": "자유 그리기 안내 (200자 이내)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "예술경험"이어야 합니다.`;

/** Content focus sub-modules for coloring worksheet */
export const COLORING_CONTENT_FOCUS: Record<string, string> = {
  favorite_scene: `### 콘텐츠 초점: 좋아하는 장면
동화에서 유아가 가장 좋아할 만한 인상적인 장면 1개를 선택합니다.
배경, 캐릭터, 소품 등 다양한 요소가 포함된 장면이 좋습니다.
색칠할 요소를 풍부하게 제공하세요.`,

  character_close_up: `### 콘텐츠 초점: 캐릭터 클로즈업
주인공이나 주요 캐릭터를 크게 그려 색칠하는 활동입니다.
캐릭터의 표정, 옷, 소지품 등 디테일한 요소에 집중합니다.
캐릭터를 색칠하면서 성격과 감정을 탐색할 수 있게 안내하세요.`,

  whole_story: `### 콘텐츠 초점: 이야기 전체
이야기의 시작, 중간, 끝 장면을 각각 색칠하는 활동입니다.
2~3개 장면을 선택하여 이야기 흐름을 시각적으로 재현합니다.
각 장면의 분위기 변화를 색상으로 표현하도록 안내하세요.`,
};
