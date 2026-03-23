/**
 * Roleplay script worksheet activity prompt module.
 * Based on Parten's play development stages and sociodramatic play theory.
 *
 * @module worksheet/prompts/activities/roleplay-script
 */

export const ROLEPLAY_SCRIPT_ACTIVITY_MODULE = `## 활동지 유형: 역할놀이 대본 활동지
누리과정 영역: 예술경험 (창의적으로 표현하기, 예술 감상하기)

### 교육학적 근거
- Parten 놀이 발달: 병행놀이 → 연합놀이 → 협동놀이 (만3~5세 전환)
- 사회극놀이(sociodramatic play): 역할 배정, 대본, 소품으로 상상력과 사회성 동시 발달
- Smilansky: 극화놀이의 6요소 (역할, 소품, 상상, 대사, 지속, 상호작용)

### 생성 규칙
1. characters_list: 등장인물 2~4명, 각각 이름/역할 설명/의상 힌트를 포함합니다.
2. scenes: 2~4개 장면, 각 장면에 narrator_line(내레이션)과 lines(대사 목록)을 포함합니다.
3. 각 line에 speaker(화자), line(대사), stage_direction(무대지시, 선택), emotion_cue(감정 힌트, 선택)를 포함합니다.
4. props_list: 연극에 필요한 소품 목록 (최대 5개)
5. discussion_after: 공연 후 이야기 나누기 질문 (선택)
6. 대사는 유아가 따라할 수 있도록 짧고 쉽게 작성하세요.

### 출력 JSON 스키마 (이 구조를 정확히 따르세요)
\`\`\`json
{
  "title": "동화 제목 - 역할놀이 대본",
  "subtitle": "부제목 (80자 이내)",
  "instructions": "선생님 안내 문구 (200자 이내)",
  "nuri_domain": "예술경험",
  "characters_list": [
    {
      "name": "캐릭터 이름 (50자 이내)",
      "role_description": "역할 설명 (100자 이내)",
      "costume_hint": "의상 힌트 (100자 이내)"
    }
  ],
  "scenes": [
    {
      "scene_title": "장면 제목 (50자 이내)",
      "narrator_line": "내레이션 (200자 이내)",
      "lines": [
        {
          "speaker": "화자 이름 (50자 이내)",
          "line": "대사 (200자 이내)",
          "stage_direction": "무대지시 (100자 이내, 선택)",
          "emotion_cue": "감정 힌트 (30자 이내, 선택)"
        }
      ]
    }
  ],
  "props_list": ["소품 이름 (50자 이내)"],
  "discussion_after": "공연 후 이야기 나누기 (200자 이내, 선택)"
}
\`\`\`
⚠️ 위 JSON 구조만 출력하세요. 래퍼 객체(activity_sheet 등)로 감싸지 마세요.
⚠️ nuri_domain은 반드시 "예술경험"이어야 합니다.`;

/** Content focus sub-modules for roleplay script worksheet */
export const ROLEPLAY_SCRIPT_CONTENT_FOCUS: Record<string, string> = {
  whole_story: `### 콘텐츠 초점: 전체 이야기
동화 전체를 축약한 대본입니다.
도입→갈등→해결 구조를 3~4개 장면으로 압축하여 구성하세요.
모든 주요 등장인물을 포함합니다.`,

  climax_scene: `### 콘텐츠 초점: 절정 장면
이야기의 가장 극적인 장면을 중심으로 대본을 구성합니다.
2~3개 장면으로, 갈등이 최고조에 이르고 해결되는 과정을 보여주세요.
감정 표현이 풍부한 대사를 포함합니다.`,

  happy_ending: `### 콘텐츠 초점: 해피엔딩
이야기의 해결과 교훈이 드러나는 부분을 대본으로 구성합니다.
갈등 해결 → 화해/성장 → 행복한 결말 순서로 구성하세요.
따뜻한 감정의 대사를 중심으로 합니다.`,
};

/** Output style sub-modules for roleplay script worksheet */
export const ROLEPLAY_SCRIPT_OUTPUT_STYLE: Record<string, string> = {
  simple_script: `### 출력 스타일: 간단 대본
각 장면에 1~2개 대사만 포함하는 간결한 대본입니다.
대사를 짧고 반복적으로 구성하여 만3세도 참여할 수 있게 합니다.
stage_direction과 emotion_cue는 최소화합니다.`,

  full_script: `### 출력 스타일: 풍성한 대본
각 장면에 3~6개 대사를 포함하는 풍성한 대본입니다.
stage_direction과 emotion_cue를 풍부하게 포함하세요.
만4~5세에게 적합합니다.`,

  reader_theater: `### 출력 스타일: 낭독극 (리더스 시어터)
내레이터가 많은 부분을 읽고, 등장인물은 핵심 대사만 말합니다.
narrator_line을 길게, lines를 짧게 구성하세요.
읽기 연습과 연극을 결합한 형태입니다.`,
};

/** Extra detail sub-modules for roleplay script worksheet */
export const ROLEPLAY_SCRIPT_EXTRA_DETAIL: Record<string, string> = {
  small_group: `### 추가 설정: 소그룹 활동
4~6명 소그룹으로 진행하는 연극입니다.
등장인물을 2~3명으로 제한하고, 나머지는 관객/소품 담당으로 참여합니다.
교실 한쪽에서 간단히 할 수 있는 규모로 구성하세요.`,

  class_play: `### 추가 설정: 학급 공연
전체 학급이 참여하는 큰 공연입니다.
등장인물을 3~4명, 나레이터 1명, 나머지는 배경/소품/음향 역할을 맡깁니다.
무대 지시를 상세하게 포함하세요.`,
};
