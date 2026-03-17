# 파이프라인 워크플로우 상세 가이드

## 전체 데이터 흐름

```
교사 입력
    │
    ▼
[오케스트레이터] ──── 크리에이티브 브리프 수집
    │
    ▼
[① 스토리 아키텍트] ──── 서사 구조 + 플롯 + 누리과정 매핑
    │
    ├──→ [② 캐릭터 DNA 디자이너] ──── 시각적·성격적 DNA 시트
    │         │
    └──→ [③ 텍스트 라이터] ──── 14개 스프레드 텍스트 + 글-그림 태깅
              │
              ▼
         [④ 아트 디렉터] ──── 14개 삽화 지시서 + 색채 전략
              │
              ▼
         [⑤ AI 일러스트레이터] ──── 14개 삽화 이미지
              │
              ▼
         [⑥ 레이아웃 컴포저] ──── 조판 완료 그림책
              │
              ▼
         [⑦ 발달단계 검수관] ──── 검수 보고서
              │
              ├── PASS → 최종 출력
              └── REVISE → 해당 에이전트로 피드백 루프
```

## 에이전트 간 데이터 패킷 규격

### 오케스트레이터 → 스토리 아키텍트

```json
{
  "packet_type": "BRIEF_TO_STORY",
  "brief": {
    "target_age_group": "3-4",
    "target_age_months_min": 36,
    "target_age_months_max": 59,
    "theme_keywords": ["공룡", "나누기", "친구"],
    "edu_goal": "타인 배려와 나눔의 기쁨을 경험한다",
    "nuri_areas_primary": "사회관계",
    "nuri_areas_secondary": ["의사소통"],
    "tone": ["유머러스", "따뜻한"],
    "usage_context": "대집단_읽어주기",
    "character_preference": "동물",
    "special_requests": ["반 아이 하준이 이름 반영 가능"],
    "page_format": "standard_32"
  }
}
```

### 스토리 아키텍트 → 오케스트레이터 (승인 요청)

```json
{
  "packet_type": "PLOT_APPROVAL_REQUEST",
  "narrative_structure": "problem_solution_with_rule_of_three",
  "structure_rationale": "만 3-4세의 인과관계 이해 발달 시기에 적합. 3번의 시도 패턴이 참여를 유도.",
  "total_spreads": 14,
  "plot_breakdown": [
    {
      "spread": 1,
      "act": 1,
      "beat": "SETUP",
      "summary": "숲속 마을 소개. 아기 공룡 '또리'가 빨간 열매를 한 바구니 발견",
      "emotion": "호기심, 기쁨",
      "page_turn_hook": "또리가 열매를 혼자 다 먹으려고 안고 달리기 시작"
    }
  ],
  "nuri_mapping": {
    "사회관계": ["다른 사람의 감정에 공감한다", "서로 돕는다"],
    "의사소통": ["자신의 경험을 이야기해 본다", "상황에 적절한 단어를 사용한다"]
  },
  "character_list": [
    {"name": "또리", "role": "protagonist", "species": "아기 트리케라톱스"},
    {"name": "뭉치", "role": "friend", "species": "아기 스테고사우루스"},
    {"name": "하하", "role": "friend", "species": "아기 프테라노돈"}
  ]
}
```

### 오케스트레이터 → 캐릭터 DNA 디자이너

```json
{
  "packet_type": "BRIEF_TO_CHARACTER",
  "approved_plot": "...(확정된 플롯)",
  "character_list": "...(캐릭터 목록)",
  "target_age_group": "3-4",
  "visual_complexity": "medium",
  "tone": ["유머러스", "따뜻한"],
  "style_preference": "수채화풍 / 동글동글 / 파스텔",
  "special_requests": []
}
```

### 오케스트레이터 → 텍스트 라이터

```json
{
  "packet_type": "BRIEF_TO_TEXT",
  "approved_plot": "...(확정된 14개 스프레드 플롯)",
  "character_names": {"또리": "protagonist", "뭉치": "friend", "하하": "friend"},
  "target_age_group": "3-4",
  "language_params": {
    "total_word_limit": 600,
    "words_per_spread": "20-40",
    "sentence_structure": "simple_with_some_compound",
    "repetition_pattern": "refrain_with_variation",
    "onomatopoeia_density": "medium"
  },
  "tone": ["유머러스", "따뜻한"],
  "text_image_roles": "complementary"
}
```

### 텍스트 라이터 + 캐릭터 DNA → 아트 디렉터

```json
{
  "packet_type": "BRIEF_TO_ART_DIRECTION",
  "approved_text": "...(14개 스프레드 텍스트)",
  "character_dna_sheets": "...(캐릭터 DNA 시트)",
  "emotional_arc": [
    {"spread": 1, "emotion": "호기심+기쁨", "intensity": 0.6},
    {"spread": 7, "emotion": "긴장+당혹", "intensity": 0.8},
    {"spread": 14, "emotion": "따뜻함+행복", "intensity": 1.0}
  ],
  "text_image_tags": [
    {"spread": 1, "relationship": "complementary", "image_must_show": "숲속 배경, 빨간 열매 바구니의 크기감"},
    {"spread": 2, "relationship": "enhancing", "image_must_show": "또리의 탐욕스러운 표정 (텍스트에서 직접 언급 안 함)"}
  ]
}
```

### 아트 디렉터 → AI 일러스트레이터

```json
{
  "packet_type": "ILLUSTRATION_BRIEF",
  "spread_id": 1,
  "scene_description": "밝은 숲속 풀밭. 아기 트리케라톱스 또리가 빨간 열매 바구니를 발견하고 눈을 반짝이며 바라보는 장면.",
  "composition": {
    "viewpoint": "아이 눈높이 (로우앵글 살짝)",
    "focal_point": "또리의 눈과 빨간 열매 바구니",
    "rule": "삼분할 좌측에 또리, 우측에 바구니",
    "visual_flow": "좌→우 (또리 시선 방향이 바구니를 향함)"
  },
  "color_palette": {
    "dominant": "#7CB342 (숲속 초록)",
    "accent": "#E53935 (빨간 열매)",
    "mood": "따뜻하고 밝은 오전 햇살"
  },
  "character_refs": {
    "또리": "character_dna_sheet_tori.json"
  },
  "molly_bang_principles": ["둥근 형태=안전감", "밝은 색=기쁨", "하단 배치=안정감"],
  "style_ref": "수채화+디지털, 부드러운 윤곽선, 파스텔 배경",
  "ai_tool_prompt": "...(도구별 최적화 프롬프트)"
}
```

### 발달단계 검수관 → 오케스트레이터 (검수 결과)

```json
{
  "packet_type": "REVIEW_RESULT",
  "overall_verdict": "REVISE",
  "scores": {
    "developmental_appropriateness": 85,
    "nuri_alignment": 92,
    "text_image_coherence": 78,
    "emotional_consistency": 88,
    "cultural_sensitivity": 95,
    "safety": 100
  },
  "issues": [
    {
      "spread": 3,
      "severity": "HIGH",
      "category": "vocabulary",
      "detail": "'화석'은 만 3-4세에게 생소한 어휘. '공룡 뼈'로 대체 권장",
      "route_to": "text-writer"
    },
    {
      "spread": 7,
      "severity": "MEDIUM",
      "category": "text_image_relationship",
      "detail": "텍스트는 슬픔을 표현하나 삽화의 색채가 지나치게 밝음. 색온도를 약간 낮추면 감정 정렬도 향상",
      "route_to": "ai-illustrator"
    }
  ],
  "recommendations": [
    "스프레드 12의 해결 장면에서 또리의 내적 변화를 보여주는 표정 변화가 더 강조되면 좋겠습니다"
  ]
}
```

## 교사 확인 포인트(Checkpoint) 운영 가이드

### Checkpoint ① 플롯 승인 (Phase 1 → Phase 2 전환)

교사에게 보여줄 것:
- 한 줄 요약 ("공룡 친구 또리가 열매를 나누는 법을 배우는 이야기예요")
- 14개 스프레드 요약 (각 1~2문장)
- 주요 전환점 3개 강조
- 누리과정 연계 영역 표시

교사 선택지:
- "좋아요, 진행해 주세요" → Phase 2로
- "이 부분을 바꾸고 싶어요" → 스토리 아키텍트 수정 후 재승인
- "처음부터 다시" → Phase 0으로

### Checkpoint ② 캐릭터 + 텍스트 승인 (Phase 2 → Phase 3 전환)

교사에게 보여줄 것:
- 캐릭터 컨셉 설명 (이름, 성격, 시각적 특징 묘사)
- 텍스트 전체 (14개 스프레드, 소리 내어 읽기 추천)
- 예상 읽기 시간
- 반복 패턴 하이라이트

### Checkpoint ③ 스타일 승인 (Phase 3 중간)

교사에게 보여줄 것:
- 첫 3개 스프레드 삽화 시안
- 스타일 선택지 2~3개 (가능한 경우)
- "이 스타일로 14장 전부 진행합니다" 안내

### Checkpoint ④ 최종 승인 (Phase 4 완료)

교사에게 보여줄 것:
- 완성된 그림책 전체 (스프레드 단위 순서대로)
- 발달 적합성 점수 및 간단한 해설
- 수정이 필요한 부분 표시 (있을 경우)
- 다운로드/출력 옵션

## 누리과정 월별 생활주제 참조 (교사 주제 미정 시 제안용)

| 월 | 생활주제 예시 |
|---|---|
| 3월 | 어린이집/유치원과 친구, 새로운 환경 |
| 4월 | 봄, 동식물과 자연, 나와 가족 |
| 5월 | 나와 가족, 우리 동네 |
| 6월 | 우리 동네, 건강과 안전 |
| 7월 | 여름, 물놀이, 건강과 안전 |
| 8월 | 교통기관, 여름 |
| 9월 | 우리나라, 세계 여러 나라 |
| 10월 | 가을, 우리나라 |
| 11월 | 환경과 생활, 생활도구 |
| 12월 | 겨울, 생활도구 |
| 1월 | 겨울, 새해 |
| 2월 | 수료와 졸업, 형님반에 가요 |

이 표는 참고용이며, 2019 개정 누리과정은 정해진 주제 순서를 강제하지 않는다. 유아의 실제 관심과 놀이에서 자연스럽게 발현되는 주제를 우선한다.

## 오류 처리 및 폴백

### AI 이미지 생성 실패 시
1차 실패: 프롬프트 자동 조정 후 재시도
2차 실패: 다른 AI 도구로 전환
3차 실패: 교사에게 알리고 대안 제시 (텍스트 우선 완성, 삽화 후속 진행)

### 캐릭터 일관성 실패 시
유사도 70% 이하: 캐릭터 참조 강도 상향 후 재생성
유사도 50% 이하: 캐릭터 DNA 시트 재생성 후 전체 삽화 재시작

### 발달 검수 반복 실패 시 (3회 이상 REVISE)
교사에게 현재 상태를 보여주고, 수동 확인을 요청한다.
"선생님, 몇 군데 자동 수정이 잘 안 되는 부분이 있어요. 직접 봐주시면 더 좋은 결과가 나올 것 같아요."
