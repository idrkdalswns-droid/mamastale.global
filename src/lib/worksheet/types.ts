/**
 * Worksheet service type definitions.
 * @module worksheet/types
 */

export type ActivityType =
  | "emotion"
  | "post_reading"
  | "coloring"
  | "story_map"
  | "character_card"
  | "vocabulary"
  | "what_if"
  | "speech_bubble"
  | "roleplay_script";

export type AgeGroup = "age_3" | "age_4" | "age_5" | "mixed";

/** Parameters from the onboarding wizard (user selections) */
export interface WorksheetParams {
  story_id: string;
  activity_type: ActivityType;
  age_group: AgeGroup;
  character_focus: string; // character name or "all"
  content_focus: string; // Q3 selection
  output_style: string; // Q4 selection
  extra_detail?: string; // Q5 (emotion/roleplay only)
  is_recommended: boolean;
}

/** System-computed design variables derived from age_group */
export interface DerivedParams {
  font_size_body_pt: number;
  font_size_title_pt: number;
  drawing_space_ratio: number;
  line_thickness_mm: number;
  coloring_regions: number;
  sentence_length: string;
  activity_duration_min: number;
  hangul_level: "whole_word" | "no_batchim" | "with_batchim";
  instruction_complexity: "icon_only" | "simple_sentence" | "full_sentence";
  max_elements_per_page: number;
  vocabulary_level: number;
  writing_ratio: number; // 0-1, ratio of writing vs drawing space
}

/** Onboarding question definition */
export interface WorksheetQuestion {
  id: string;
  label: string; // Korean, informal polite (해요체)
  options: { value: string; label: string; description?: string }[];
}

/** Activity type metadata for card display */
export interface ActivityMeta {
  type: ActivityType;
  name: string;
  description: string;
  nuri_domain: string;
  question_count: number; // 3-5
  available: boolean; // Phase 1-A: only emotion + post_reading
}

/** All 9 activity types with metadata */
export const ACTIVITY_META: ActivityMeta[] = [
  { type: "emotion", name: "감정 활동지", description: "캐릭터의 감정을 탐색해요", nuri_domain: "사회관계", question_count: 5, available: true },
  { type: "post_reading", name: "독후활동지", description: "그리기+생각 쓰기로 이야기를 되짚어요", nuri_domain: "의사소통", question_count: 4, available: true },
  { type: "coloring", name: "색칠놀이", description: "동화 속 장면을 색칠해요", nuri_domain: "예술경험", question_count: 3, available: true },
  { type: "story_map", name: "스토리맵", description: "이야기 흐름을 한눈에 정리해요", nuri_domain: "의사소통", question_count: 4, available: true },
  { type: "character_card", name: "등장인물 카드", description: "캐릭터를 소개하는 카드를 만들어요", nuri_domain: "사회관계", question_count: 4, available: true },
  { type: "vocabulary", name: "낱말 탐험", description: "동화 속 낱말을 배워요", nuri_domain: "의사소통", question_count: 4, available: true },
  { type: "what_if", name: "나라면? 상상", description: "내가 주인공이라면 어떻게 할까?", nuri_domain: "사회관계", question_count: 4, available: true },
  { type: "speech_bubble", name: "말풍선 대화", description: "캐릭터에게 말을 걸어봐요", nuri_domain: "의사소통", question_count: 4, available: true },
  { type: "roleplay_script", name: "역할놀이 대본", description: "함께 연극을 해봐요", nuri_domain: "예술경험", question_count: 5, available: true },
];

/** Questions per activity type */
export function getQuestionsForActivity(
  activityType: ActivityType
): WorksheetQuestion[] {
  const common: WorksheetQuestion[] = [
    {
      id: "age_group",
      label: "우리 반 아이들은 몇 살인가요?",
      options: [
        { value: "age_3", label: "만 3세" },
        { value: "age_4", label: "만 4세" },
        { value: "age_5", label: "만 5세" },
        { value: "mixed", label: "혼합반 (3~5세)" },
      ],
    },
    {
      id: "character_focus",
      label: "어떤 캐릭터에 집중할까요?",
      options: [], // Populated dynamically from story metadata
    },
  ];

  const specific = ACTIVITY_QUESTIONS[activityType] || [];
  return [...common, ...specific];
}

const ACTIVITY_QUESTIONS: Partial<Record<ActivityType, WorksheetQuestion[]>> = {
  emotion: [
    {
      id: "content_focus",
      label: "어떤 감정을 탐색해볼까요?",
      options: [
        { value: "specific_emotion", label: "특정 감정 장면", description: "주인공이 강한 감정을 느끼는 장면" },
        { value: "emotion_change", label: "감정 변화 (전→후)", description: "감정이 어떻게 바뀌었는지" },
        { value: "emotion_flow", label: "전체 감정 흐름", description: "이야기 전체의 감정선" },
      ],
    },
    {
      id: "output_style",
      label: "어떤 느낌이 좋을까요?",
      options: [
        { value: "drawing", label: "그리기 중심", description: "감정 얼굴 그리기" },
        { value: "matching", label: "선택하기 중심", description: "감정 아이콘 매칭" },
        { value: "mixed", label: "쓰기+그리기 혼합", description: "선택 후 그리기" },
      ],
    },
    {
      id: "extra_detail",
      label: "복합 감정도 포함할까요?",
      options: [
        { value: "simple", label: "기본 감정만", description: "기쁨, 슬픔, 화남, 무서움" },
        { value: "complex", label: "복합 감정 포함", description: "기쁘면서 무서운 등" },
      ],
    },
  ],
  post_reading: [
    {
      id: "content_focus",
      label: "어떤 독후활동이 좋을까요?",
      options: [
        { value: "comprehension", label: "이해 (내용 되짚기)", description: "이야기를 잘 이해했는지" },
        { value: "appreciation", label: "감상 (느낌 표현)", description: "느낌과 감정을 표현" },
        { value: "creative", label: "창의확장 (상상)", description: "새로운 이야기 만들기" },
      ],
    },
    {
      id: "output_style",
      label: "그리기와 쓰기 비율은?",
      options: [
        { value: "drawing_heavy", label: "그리기 중심 (90:10)", description: "대부분 그림으로" },
        { value: "balanced", label: "반반 (50:50)", description: "그리기+쓰기 균형" },
        { value: "writing_heavy", label: "쓰기 중심 (30:70)", description: "생각을 글로" },
      ],
    },
  ],
  coloring: [
    {
      id: "content_focus",
      label: "어떤 장면을 색칠할까요?",
      options: [
        { value: "favorite_scene", label: "좋아하는 장면", description: "인상적인 장면 하나" },
        { value: "character_close_up", label: "캐릭터 클로즈업", description: "캐릭터를 크게 그려요" },
        { value: "whole_story", label: "이야기 전체", description: "시작~끝 여러 장면" },
      ],
    },
  ],
  vocabulary: [
    {
      id: "content_focus",
      label: "어떤 낱말을 탐험할까요?",
      options: [
        { value: "emotion_words", label: "감정 낱말", description: "기분을 나타내는 말" },
        { value: "action_words", label: "동작 낱말", description: "행동을 나타내는 말" },
        { value: "story_key_words", label: "핵심 낱말", description: "이야기의 중요한 말" },
      ],
    },
    {
      id: "output_style",
      label: "어떤 활동이 좋을까요?",
      options: [
        { value: "explore", label: "탐색 중심", description: "낱말 카드로 알아봐요" },
        { value: "puzzle", label: "퍼즐 중심", description: "놀이처럼 익혀요" },
        { value: "writing", label: "쓰기 중심", description: "직접 써봐요" },
      ],
    },
  ],
  character_card: [
    {
      id: "content_focus",
      label: "캐릭터를 어떻게 탐색할까요?",
      options: [
        { value: "single_deep", label: "한 캐릭터 깊이 탐색", description: "주인공을 자세히 알아봐요" },
        { value: "multi_compare", label: "여러 캐릭터 비교", description: "캐릭터를 비교해봐요" },
        { value: "my_character", label: "나만의 캐릭터", description: "내 캐릭터를 만들어요" },
      ],
    },
    {
      id: "output_style",
      label: "카드 스타일을 골라주세요!",
      options: [
        { value: "drawing_card", label: "그리기 카드", description: "캐릭터를 크게 그려요" },
        { value: "info_card", label: "정보 카드", description: "프로필을 정리해요" },
        { value: "trading_card", label: "트레이딩 카드", description: "모을 수 있는 카드" },
      ],
    },
  ],
  story_map: [
    {
      id: "content_focus",
      label: "이야기를 어떻게 정리할까요?",
      options: [
        { value: "simple_flow", label: "간단한 흐름 (3단계)", description: "시작→중간→끝" },
        { value: "four_parts", label: "기승전결 (4단계)", description: "기→승→전→결" },
        { value: "detailed", label: "상세 흐름 (5단계)", description: "도입→갈등→시도→해결→교훈" },
      ],
    },
    {
      id: "output_style",
      label: "맵 스타일을 골라주세요!",
      options: [
        { value: "drawing_map", label: "그리기 맵", description: "그림으로 표현해요" },
        { value: "text_map", label: "글쓰기 맵", description: "글로 정리해요" },
        { value: "sticker_map", label: "스티커 맵", description: "순서대로 붙여요" },
      ],
    },
  ],
  what_if: [
    {
      id: "content_focus",
      label: "어떤 장면에서 상상해볼까요?",
      options: [
        { value: "conflict_moment", label: "갈등 장면", description: "캐릭터가 어려운 상황에 놓인 순간" },
        { value: "choice_moment", label: "선택의 순간", description: "중요한 결정을 해야 하는 순간" },
        { value: "relationship_moment", label: "관계 장면", description: "캐릭터 사이의 관계가 드러나는 순간" },
      ],
    },
    {
      id: "output_style",
      label: "어떻게 표현해볼까요?",
      options: [
        { value: "drawing_imagine", label: "상상 그리기", description: "내가 캐릭터라면 어떤 모습일까?" },
        { value: "question_deep", label: "깊은 질문 중심", description: "생각을 글로 표현해요" },
        { value: "story_extend", label: "이야기 확장", description: "그다음에 어떤 일이?" },
      ],
    },
  ],
  speech_bubble: [
    {
      id: "content_focus",
      label: "어떤 대화를 만들어볼까요?",
      options: [
        { value: "key_dialogue", label: "핵심 대화", description: "이야기의 중요한 대화 장면" },
        { value: "emotion_dialogue", label: "감정 대화", description: "감정을 표현하는 대화" },
        { value: "conflict_dialogue", label: "갈등 대화", description: "의견이 다른 대화" },
      ],
    },
    {
      id: "output_style",
      label: "말풍선을 어떻게 채울까요?",
      options: [
        { value: "fill_bubble", label: "빈 말풍선 채우기", description: "빈칸에 대사를 넣어요" },
        { value: "read_and_add", label: "읽고 덧붙이기", description: "대화를 이어가요" },
        { value: "free_dialogue", label: "자유 대화 만들기", description: "직접 대화를 만들어요" },
      ],
    },
  ],
  roleplay_script: [
    {
      id: "content_focus",
      label: "어떤 부분을 연극할까요?",
      options: [
        { value: "whole_story", label: "전체 이야기", description: "처음부터 끝까지 연극해요" },
        { value: "climax_scene", label: "절정 장면", description: "가장 극적인 장면을 연극해요" },
        { value: "happy_ending", label: "해피엔딩", description: "행복한 결말을 연극해요" },
      ],
    },
    {
      id: "output_style",
      label: "대본 스타일을 골라주세요!",
      options: [
        { value: "simple_script", label: "간단 대본", description: "짧은 대사로 쉽게" },
        { value: "full_script", label: "풍성한 대본", description: "무대지시까지 포함" },
        { value: "reader_theater", label: "낭독극", description: "읽으면서 연기해요" },
      ],
    },
    {
      id: "extra_detail",
      label: "연극 규모를 골라주세요!",
      options: [
        { value: "small_group", label: "소그룹 (4~6명)", description: "교실 한쪽에서 간단히" },
        { value: "class_play", label: "학급 공연", description: "전체 반이 참여해요" },
      ],
    },
  ],
};
