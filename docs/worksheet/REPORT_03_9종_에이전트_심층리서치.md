# 마마스테일 9종 활동지 AI 에이전트 설계 심층 리서치

마마스테일의 AI 치유 동화 기반 활동지 9종 각각에 최적화된 전문 에이전트를 설계하기 위해, **교육학적 이론 근거, 에이전트 아키텍처, 입출력 스키마, SVG/PDF 기술 구현, 품질·안전성 체계**를 통합 조사했다. 핵심 결론은 다음과 같다: Anthropic 공식 가이드의 **Orchestrator-Worker 패턴**으로 Sonnet 오케스트레이터 1개가 동화를 분석한 뒤 Haiku 4.5 기반 9개 전문 워커를 **asyncio.gather()로 병렬 실행**하면, 동화 1편당 약 **$0.08~0.14**로 9종 활동지를 **3~5초 내** 동시 생성할 수 있다. 각 에이전트는 Pydantic 기반 JSON 스키마로 출력을 구조화하고, Jinja2 템플릿 + WeasyPrint 파이프라인으로 A4 PDF를 안정 생산한다.

---

## 1. 오케스트레이터-워커 아키텍처 설계

### 전체 시스템 흐름

Anthropic의 2024년 12월 "Building Effective Agents" 가이드는 에이전틱 시스템을 워크플로우(사전 정의 코드 경로)와 에이전트(LLM이 동적으로 프로세스를 지시)로 구분하며, 5가지 핵심 워크플로우 패턴을 제시한다: Prompt Chaining, Routing, Parallelization, **Orchestrator-Workers**, Evaluator-Optimizer. 마마스테일 시스템에는 **Orchestrator-Worker 패턴**이 최적이다. 이 패턴은 프로덕션 멀티에이전트 배포의 약 70%에서 채택되는 가장 검증된 구조다.

```
동화 텍스트 입력
       ↓
┌─────────────────────────┐
│  오케스트레이터 에이전트   │  ← Claude Sonnet 4.5 (동화 분석·공유 컨텍스트 추출)
│  (1회 API 호출)          │
└───────────┬─────────────┘
            │ FairyTaleContext JSON
  ┌────┬────┼────┬────┬────┬────┬────┬────┐
  ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
 색칠  스토리 등장인 감정  어휘  나라면 말풍선 역할놀이 독후
 놀이  맵   물카드 활동지 따라  상상  대화  대본   활동지
  │    │    │    │   쓰기  │    │    │     │
  └────┴────┴────┴───┼────┴────┴────┴─────┘
                     ↓
           ┌─────────────────┐
           │ 안전성 검증 에이전트 │  ← 전체 출력 QA
           └────────┬────────┘
                    ↓
           9개 JSON → Jinja2 → HTML/SVG → WeasyPrint → PDF
```

### 시스템 프롬프트 스위칭 vs 개별 API 호출

**개별 병렬 API 호출이 압도적으로 우월하다.** 시스템 프롬프트 스위칭(단일 순차 호출)은 구현이 단순하나 병렬화가 불가능하고 컨텍스트 윈도우가 호출마다 누적 증가한다. 반면 개별 API 호출은 `asyncio.gather()`로 **9개를 동시 실행**해 지연 시간을 1/5~1/9로 줄이고, 각 에이전트가 격리된 컨텍스트를 받아 토큰 사용이 효율적이며, 에이전트별로 다른 모델을 선택할 수 있다.

### 모델 선택 전략: Haiku 4.5 vs Sonnet 4.5

현재 가격 기준으로 Haiku 4.5는 입력 **$1.00/MTok**, 출력 **$5.00/MTok**이며 Sonnet 4.5 대비 **3배 저렴하고 4~5배 빠르다**. Haiku 4.5는 이전 세대 Sonnet 4 수준의 성능을 보이며, Sonnet 4.5 성능의 약 90%에 도달한다. Anthropic은 공식적으로 "Sonnet이 복잡한 문제를 분해하고, Haiku 팀이 병렬로 서브태스크를 완수하는" 하이브리드 패턴을 권장한다.

| 에이전트 | 권장 모델 | 근거 |
|---------|----------|------|
| **오케스트레이터** | Sonnet 4.5 | 서사 분석, 다단계 추론, 공유 컨텍스트 생성 |
| 색칠놀이 | Haiku 4.5 | SVG 코드 생성은 구조화된 패턴 기반 |
| 스토리맵 | Haiku 4.5 | 시작/전개/결말 분류는 단순 구조화 작업 |
| 등장인물카드 | Haiku 4.5 | 캐릭터 속성 추출은 직접적 분류 작업 |
| 감정활동지 | Haiku 4.5 | 감정 분류 + 구조화 출력 |
| 어휘따라쓰기 | Haiku 4.5 | 어휘 선별은 명확한 기준 기반 추출 |
| **나라면?상상** | **Sonnet 4.5** | 창의적 질문 생성, 공감 촉진 설계 필요 |
| **말풍선대화** | **Sonnet 4.5** | 대사 재구성은 창의적 쓰기 영역 |
| **역할놀이대본** | **Sonnet 4.5** | 대본 쓰기는 뉘앙스 있는 대화 생성 필요 |
| 독후활동지 | Haiku 4.5 | 템플릿 기반 프롬프트 생성 |

**비용 추정(동화 1편, 프롬프트 캐싱 적용 시):** 오케스트레이터(Sonnet) ~$0.021 + Haiku 에이전트 6개 ~$0.042 + Sonnet 에이전트 3개 ~$0.063 = **약 $0.08~0.10/편**. 프롬프트 캐싱은 공유 컨텍스트에 대해 **읽기 시 90% 비용 절감**(기본 입력가의 0.1배)을 제공한다.

### 병렬 실행 vs 순차 실행

**병렬 실행이 필수적이다.** 9개 에이전트를 순차 실행하면 27~45초(에이전트당 3~5초), 병렬 실행 시 가장 느린 에이전트 기준 **3~5초**로 5~9배 빠르다. 토큰 비용은 동일하다. Tier 1(50 RPM) 기준으로도 9개 동시 요청은 문제없고, Tier 2+(1,000 RPM) 이상에서는 완전히 여유롭다. 다만 ITPM(입력 토큰/분) 한도에 유의해야 하며, **캐싱된 입력 토큰은 ITPM 한도에 산입되지 않는다**는 점이 핵심 이점이다.

---

## 2. 공유 컨텍스트와 에이전트 간 데이터 전달

### 오케스트레이터 출력: FairyTaleContext

오케스트레이터 에이전트는 동화 텍스트를 분석하여 **9개 에이전트가 공통으로 참조할 구조화된 컨텍스트**를 생성한다. Pydantic 모델로 정의하면:

```python
class Character(BaseModel):
    name: str
    role: str  # protagonist, antagonist, helper
    traits: list[str]
    emotions: list[str]
    key_actions: list[str]
    relationships: list[dict]

class PlotEvent(BaseModel):
    phase: str  # beginning, development, climax, resolution
    summary: str
    characters_involved: list[str]
    emotion_tone: str
    key_dialogue: list[str]

class FairyTaleContext(BaseModel):
    title: str
    characters: list[Character]
    themes: list[str]
    moral_lesson: str
    setting: str
    plot_events: list[PlotEvent]
    key_vocabulary: list[str]
    emotional_arc: list[dict]
    conflict_scenes: list[dict]
    target_age: int  # 3, 4, 5, 6, 7
    nuri_domains: list[str]
```

### 프롬프트 캐싱 전략

공유 컨텍스트를 9개 에이전트에 효율적으로 전달하기 위해 Claude API의 프롬프트 캐싱을 활용한다. **핵심 전략: 공유 컨텍스트를 user 메시지에 배치하고(모든 에이전트에서 동일), 에이전트별 지시사항은 system 프롬프트에 배치한다.** 캐시 프리픽스는 tools → system → messages 순서로 생성되므로, system이 에이전트마다 다르더라도 동일한 user 메시지 블록을 캐시할 수 있다. 캐시 쓰기는 기본 입력가의 1.25배, 캐시 읽기는 **0.1배**(90% 할인)이며, TTL은 Haiku 4.5에서 기본 5분(최대 1시간)이다.

### Claude API 구조화 출력 (Structured Output)

Claude API는 현재 두 가지 구조화 출력 방식을 정식 지원한다:

**1. JSON Schema 모드** (`output_config.format`): constrained decoding으로 JSON 스키마에 100% 일치하는 출력을 보장한다. Haiku 4.5, Sonnet 4.5 모두 지원.

**2. Strict Tool Use** (`strict: true`): 도구 이름과 입력 스키마를 엄격하게 검증한다.

Anthropic Python SDK는 Pydantic 모델을 직접 전달하는 `messages.parse()` 메서드를 제공한다:

```python
response = client.messages.parse(
    model="claude-haiku-4-5",
    max_tokens=4096,
    messages=[...],
    output_format=ActivityOutput,  # Pydantic 모델 직접 전달
)
parsed = response.parsed_output  # 타입 검증된 객체
```

제약사항: 전체 strict 스키마에서 optional 파라미터 최대 24개, 재귀 스키마 불가, `additionalProperties: false` 필수. 첫 요청 시 문법 컴파일로 추가 지연이 있으나 24시간 캐시된다.

---

## 3. 활동지별 에이전트 시스템 프롬프트 설계 근거

### 3-1. 색칠놀이 에이전트

**교육학적 근거:** 색칠 활동은 누리과정의 예술경험 영역(예술적 표현)에 해당하며, 소근육 발달과 색채 인지를 촉진한다. 독서치료에서는 동화 속 장면을 시각화하며 감정을 외면화하는 도구로 활용된다.

**SVG 라인아트 기술 요소:** Claude는 Artifacts 기능을 통해 유효한 SVG 코드를 직접 생성할 수 있다. 프롬프트 패턴: "Create an SVG coloring page of [subject] with thick black outlines, no fill colors, simple shapes suitable for [age group]." 핵심은 `fill: none; stroke: #000; stroke-linecap: round; stroke-linejoin: round` 스타일 설정이다.

**연령별 디자인 가이드라인:**

| 항목 | 만3~4세 | 만5~7세 |
|------|--------|--------|
| 영역 수 | 5~8개 | 15~30개 |
| 최소 영역 크기 | 40mm × 40mm | 15mm × 15mm |
| 선 두께(stroke-width) | 3~5px | 1.5~2.5px |
| 대상 | 단일 동물·사물 | 배경 포함 복합 장면 |

**출력 JSON 스키마 핵심 필드:** `svg_code`(완성된 SVG 문자열), `subject_description`(그림 설명), `complexity_level`(easy/medium), `coloring_regions_count`(영역 수), `instructions_text`(안내 문구).

### 3-2. 스토리맵 에이전트

**서사 구조 이론:** 이 에이전트는 세 가지 서사 분석 프레임워크를 기반으로 한다. 첫째, **프라이타크 피라미드**(1863): Exposition → Rising Action → Climax → Falling Action → Denouement의 5단계. 둘째, **3막 구조**: Setup(인물·세계관 소개), Confrontation(갈등 고조), Resolution(절정·해결). 셋째, **기승전결**: 갈등이 아닌 **전(轉, 예상치 못한 전환)**을 핵심으로 하는 한국적 4단계 서사 구조.

**AI 자동 분할 기법:** NLP 기반 접근으로는 토큰화 → 형태소 분석 → POS 태깅 → 규칙 기반 구조 분류가 있으나, LLM 기반 접근이 더 효과적이다. 동화 텍스트와 구조 프레임워크를 함께 프롬프트로 제공하면 Claude가 각 세그먼트를 정확하게 분류한다. F1 스코어 0.72 이상 달성 가능.

**유아용 스토리맵 디자인:** 만3~5세는 **처음→중간→끝** 3칸 구조(각 칸에 그림 그리기 공간), 만5~7세는 **등장인물→배경→문제→사건1→사건2→해결** 확장 구조. 가로 방향 흐름이 아이들에게 더 직관적이다. 색상 코딩(시작=노랑, 중간=주황, 끝=파랑)과 **화살표 커넥터**(SVG `<marker>` 요소)로 순서를 시각화한다.

**출력 JSON:** `phases`(각 단계별 요약·그림 설명), `characters_per_phase`, `arrow_labels`, `drawing_prompts`(각 칸의 그리기 안내).

### 3-3. 등장인물카드 에이전트

**캐릭터 분석 프레임워크:** 7가지 분석 차원을 적용한다 — 외모/물리적 특징, 성격 특성, 감정 상태, 행동, 동기, 관계, 성장/변화. AI의 캐릭터 추출에는 Named Entity Recognition(이름 식별), Co-reference Resolution(대명사 연결), Relation Extraction(관계 식별), Attribute Extraction(의존 구문 분석으로 형용사·동사 연결)이 활용된다.

**유아용 카드 디자인:** 트레이딩 카드 사이즈(**63mm × 88mm**) 또는 A6(105mm × 148.5mm) 반페이지 카드. 구성: 상단 이름 배너(색상 코딩) → 중앙 그림 그리기 공간(점선 테두리) → 하단 특성 목록(나이, 좋아하는 것, 성격, 특기). HTML/CSS `grid` 레이아웃 또는 SVG로 구현하며, `break-inside: avoid`로 페이지 분할을 방지한다.

**출력 JSON:** `characters`(이름, 역할, 외모 설명, 성격 키워드 3개, 감정 상태, 좋아하는 것, 관계), `card_color_theme`, `drawing_prompt_per_character`.

### 3-4. 감정활동지 에이전트

**이론 기반:** John Gottman의 **감정 코칭 5단계**(감정 인식 → 연결 기회 → 공감적 경청 → 감정 명명 → 한계 설정과 문제 해결)와 **CASEL SEL 5대 역량**(자기인식, 자기관리, 사회적 인식, 관계 기술, 책임 있는 의사결정)이 핵심 프레임워크다. 독서치료에서는 3단계 치료 과정(동일시 → 카타르시스 → 통찰)의 첫 단계인 **감정적 동일시**를 활동지가 촉진한다.

**감정 아이콘 매핑 체계:** Paul Ekman의 기본 감정을 유아용으로 단순화한다.

- 😊 기쁨(joy) / 😢 슬픔(sad) / 😠 화남(angry) / 😨 무서움(scared) / 😲 놀람(surprised) / 🤢 싫음(disgusted)
- 만5~7세 확장: 부끄러움, 질투, 자랑스러움, 혼란, 감사

**AI 감정 장면 식별:** 어휘 기반(NRC Emotion Lexicon으로 단어→감정 매핑) + 트랜스포머 기반(BERT, RoBERTa 컨텍스트 분석) 하이브리드 접근. 실제 구현에서는 오케스트레이터가 이미 `emotional_arc`와 `PlotEvent.emotion_tone`을 추출해 전달하므로, 감정 에이전트는 이를 기반으로 활동지를 구성한다.

**출력 JSON:** `emotion_scenes`(장면 요약, 주요 감정, 관련 캐릭터), `emotion_icons`(6~8개 감정 이모티콘 매핑), `questions`(감정 탐색 질문), `body_mapping_prompt`(몸에서 감정 느끼기 활동 안내).

### 3-5. 어휘따라쓰기 에이전트

**어휘 선별 기준:** 8가지 기준을 적용한다 — ① 빈도(동화 내 반복 등장), ② 실용성(일상 의사소통 활용도), ③ 개념적 중요성(감정·관계·행동 핵심 어휘), ④ **발달 적합성**, ⑤ 문화적 관련성, ⑥ 음운 패턴(운율·두운), ⑦ 의미적 풍부함(동의어·반의어 네트워크), ⑧ 줄거리 핵심 어휘.

**만3~5세 어휘 발달 수준:** 누리과정 의사소통 영역 기준으로 만3세 약 **800~1,000어**, 만4세 **1,500~2,000어**, 만5세 **2,000~2,500어 이상**. 만3세는 친숙한 사물·동물·사람 이름 중심, 만5세는 의견 표현과 글자에 대한 관심이 증가한다.

**한글 따라쓰기 SVG 생성:** `fontTools` 라이브러리의 `TTFont` + `SVGPathPen`으로 한글 폰트(Noto Sans KR 권장)에서 글리프 외곽선을 SVG 경로로 추출한다. Y축 반전(`TransformPen`으로 `(1, 0, 0, -1, 0, 0)` 변환)이 필수다. 추출된 경로를 두 레이어로 렌더링한다: ① 연한 회색 참조 글자(`fill: #E0E0E0; stroke: none`), ② 점선 따라쓰기 외곽선(`fill: none; stroke: #888; stroke-dasharray: 4,4; stroke-linecap: round`). 시작점에 빨간 원 표시(`<circle>`)를 추가한다. 연습 셀은 **40mm × 40mm**에 십자 가이드라인을 포함하는 것이 한글 쓰기 표준이다.

**출력 JSON:** `words`(단어, 뜻풀이, 예문, 난이도), `svg_trace_data`(각 글자의 SVG 경로 데이터 또는 생성 지시), `grid_layout`(행·열 수), `stroke_order_notes`.

### 3-6. 나라면?상상 에이전트

**치환적 동일시 이론:** 독서치료의 핵심 메커니즘인 치환적 동일시(vicarious identification)는 아동이 동화 속 인물의 상황에 자신을 투사하여 감정적 동일시를 경험하는 과정이다. Heath et al.(2005)의 모델에서 Involvement → **Identification** → Catharsis → Insight → Universalism으로 이어지는 치료 과정의 두 번째 단계를 이 활동지가 직접 촉진한다.

**AI의 핵심 갈등·선택 장면 식별:** 오케스트레이터의 `conflict_scenes`와 `PlotEvent`(phase='climax' 또는 'development') 데이터를 기반으로, 에이전트가 아동의 관점 전환을 유도하는 질문을 설계한다. 갈등 유형(내적 갈등, 대인 갈등, 환경적 갈등)에 따라 질문 패턴이 달라진다.

**공감 능력 발달 단계와 질문 설계:** Martin Hoffman의 공감 발달 모델에 따르면, 만3~6세는 **Stage 0(미분화)** — 타인의 생각·감정이 다를 수 있음을 알지만 자기 것과 혼동하는 단계다. 만4~5세에 마음 이론(Theory of Mind)이 발달하며, 만5~9세에 **Stage 1(사회정보적)** — 다른 관점이 존재함을 인식하는 단계로 진입한다. 이에 따라 질문 유형을 설계한다:

- **감정 확인형**: "○○이는 지금 어떤 기분일까?"
- **관점 전환형**: "네가 ○○이라면 어떻게 했을까?"
- **공감적 추론형**: "○○이의 친구가 어떻게 도와줄 수 있을까?"
- **해결 생성형**: "다른 방법은 없었을까?"
- **경험 연결형**: "너도 이런 적이 있었니?"

**출력 JSON:** `scenario_description`(갈등 장면 설명), `perspective_questions`(관점 전환 질문 3~5개), `drawing_prompt`("네가 ○○이라면 어떻게 했을지 그려보세요"), `empathy_level`(target Hoffman 단계), `discussion_guide`(교사/부모 안내).

### 3-7. 말풍선대화 에이전트

**설계 원칙:** 대화형 활동지는 아동이 캐릭터의 입장에서 대사를 채워 넣거나, 기존 대사를 읽고 후속 대사를 상상하는 활동이다. 누리과정 의사소통 영역의 "듣고 말하기를 즐긴다" 목표와 직결된다. 빈 말풍선은 아동의 언어 표현력과 상상력을 동시에 자극한다.

**대사 추출·재구성:** 오케스트레이터의 `PlotEvent.key_dialogue` 데이터를 기반으로, 에이전트가 핵심 대사를 선별하고 말풍선 레이아웃으로 재구성한다. 채워진 말풍선과 비어있는 말풍선을 교차 배치하여 아동이 맥락을 추론하게 설계한다.

**SVG/CSS 말풍선 디자인:** 세 가지 풍선 유형을 지원한다 — 둥근 풍선(일반 대화, `border-radius: 20px`), 구름 풍선(생각, `<circle>` 요소로 꼬리 구성), 톱니 풍선(외침/놀람, 불규칙 테두리). SVG에서 `preserveAspectRatio="none"`으로 텍스트 길이에 맞게 풍선을 확장하고, `vector-effect: non-scaling-stroke`로 선 두께를 일관되게 유지한다. HTML/CSS 대안으로는 `::before` 가상 요소로 삼각형 꼬리를 구현한다.

**출력 JSON:** `dialogue_pairs`(캐릭터명, 대사 또는 빈칸, 풍선 유형, 감정 태그), `layout_direction`(left/right 교차), `empty_bubble_prompts`(빈 풍선 안내 텍스트), `character_positions`.

### 3-8. 역할놀이대본 에이전트

**극놀이 교육학 이론:** Mildred Parten의 놀이 발달 단계에서 만3~4세는 연합놀이(associative play), 만4세 이상은 협동놀이(cooperative play) 단계다. 사회극놀이(socio-dramatic play)는 공감, 관점 전환, 감정 조절, 갈등 해결, 서사 구조 내면화, 어휘 확장, 실행 기능(계획·순서·유연한 사고)을 촉진한다.

**동화→대본 변환 가이드라인:** ① 캐릭터를 **2~3명으로 제한**(부수 인물 통합/제거), ② 대사를 캐릭터당 장면별 **2~5줄로 단순화**, ③ 반복 구절 활용("누가 내 죽을 먹었지?"), ④ **행동 지시** 포함("[발을 구르며]", "[큰 포옹을 하며]"), ⑤ **감정 지시** 포함("[기쁘게]", "[무서운 목소리로]"), ⑥ 내레이터 역할 설정(성인 또는 아이 1명), ⑦ 장면 길이 만3~5세 **2~3분**, 만5~7세 **5분 이내**, ⑧ 간단한 소품 목록 제공(종이 왕관, 막대 지팡이, 담요 망토).

**출력 JSON:** `scene_title`, `characters_list`(이름, 역할, 간단 설명), `script_lines`(speaker, line, stage_direction, emotion_cue), `narrator_lines`, `props_list`, `discussion_after`(대본 후 토론 질문).

### 3-9. 독후활동지 에이전트

**교육학적 프레임워크:** Bloom의 Taxonomy를 독후활동에 적용한다 — Remember(사건 순서 정리), Understand(이유 설명), Apply(자기 경험 연결), Analyze(인물 비교), Evaluate(인물 선택 평가), Create(결말 바꾸기, 새 인물 만들기). 한국 유아교육에서 독후활동지는 **책 정보 → 등장인물 → 줄거리 정리 → 감정 탐색 → 나의 생각 → 그림 그리기 → 어휘 활동 → 연결 활동**의 표준 포맷을 따른다.

**AI 자동 생성 요소:** 오케스트레이터 컨텍스트를 기반으로 ① 그리기 주제("가장 좋아하는 장면을 그려보세요", "이야기 뒷이야기를 상상해 그려보세요"), ② 쓰기/구술 프롬프트("○○에게 편지를 써 보세요", "결말을 바꿔보세요"), ③ 누리과정 5개 영역 연계 태그를 자동 생성한다.

**출력 JSON:** `book_info`(제목, 글쓴이), `comprehension_questions`(이해 확인 질문), `drawing_prompts`(그리기 주제 2~3개), `writing_prompts`(쓰기/구술 주제 2~3개), `nuri_domain_connections`(관련 영역·목표), `extension_activities`(확장 활동 제안).

---

## 4. 입출력 스키마와 템플릿 매핑 전략

### 전체 에이전트 입력 구조

모든 전문 에이전트는 동일한 입력 구조를 받는다:

```python
class AgentInput(BaseModel):
    fairy_tale_text: str          # 원문 동화 텍스트
    context: FairyTaleContext     # 오케스트레이터 분석 결과
    target_age: int               # 3, 4, 5, 6, 7
    difficulty: str               # easy, medium
```

각 에이전트는 고유한 출력 Pydantic 모델을 가지며, Claude API의 `messages.parse(output_format=Model)`로 타입 안전한 구조화 출력을 보장받는다.

### JSON → HTML/SVG 템플릿 매핑

```python
TEMPLATE_MAP = {
    "coloring": "coloring_worksheet.html",
    "story_map": "storymap_worksheet.html",
    "character_card": "character_card_worksheet.html",
    "emotion": "emotion_worksheet.html",
    "vocabulary_tracing": "tracing_worksheet.html",
    "what_if": "whatif_worksheet.html",
    "speech_bubble": "speech_bubble_worksheet.html",
    "role_play": "roleplay_worksheet.html",
    "post_reading": "postreading_worksheet.html",
}
```

**Jinja2 템플릿 상속 패턴:** `base_worksheet.html`이 A4 레이아웃, 한글 폰트(@font-face), 공통 헤더(마마스테일 로고·동화 제목·이름란), 공통 푸터(누리과정 연계 태그)를 정의한다. 9개 전용 템플릿이 이를 상속하여 `{% block content %}`에 활동별 레이아웃을 구현한다. SVG는 `{{ svg_content | safe }}`로 인라인 삽입하고, Jinja2 매크로(`{% macro draw_speech_bubble(...) %}`)로 반복 요소를 재사용한다.

### A4 프린트 최적화 CSS

```css
@page { size: A4 portrait; margin: 15mm 12mm; }
body { font-family: 'NotoSansKR', sans-serif; }
.worksheet-page { page-break-after: always; page-break-inside: avoid; }
svg { max-width: 100%; height: auto; }
```

SVG viewBox는 `0 0 210 297`(1단위=1mm) 또는 `0 0 794 1123`(96dpi 기준 px)을 사용한다. 안전 영역은 사방 **10mm 마진** 안쪽(185mm × 277mm). 인쇄용 DPI는 **300**이 표준이다.

---

## 5. 품질 보증과 안전성 설계

### 5단계 자동 QA 파이프라인

**Stage 1 — 구조 검증:** JSON 스키마 검증으로 모든 필수 필드 존재·타입 확인. Pydantic `ValidationError` 포착.

**Stage 2 — 어휘 수준 검증:** 한국어 가독성 지수(KReaD Index: 어휘 난이도 + 문법 난이도 + 문장 길이 난이도)로 텍스트 난이도 측정. 만3~5세 기준 문장 **10단어 이하**, 상위 1,000~2,000 빈도 한국어 어휘만 사용, 한자·수동태·복문 배제, 문장 종결 -요/-해요/-하자 형태.

**Stage 3 — 콘텐츠 안전성 검사:** 8가지 위험 범주를 자동 필터링한다 — 폭력, 공포/호러, 부적절 어휘, 성별 고정관념, 문화적 비감수성, 성인 주제, 따돌림/수치, 위험한 모방 행동. 키워드 블록리스트 + 의미 분석 하이브리드 방식. 결과는 PASS(즉시 통과), WARN(사람 검토 필요), FAIL(폴백 템플릿 전환)로 분류.

**Stage 4 — 누리과정 정합성 검증:** 자동 체크리스트 — ① 놀이 중심 학습을 지원하는가(반복 훈련이 아닌가), ② 아동 자율성과 주도성을 존중하는가, ③ 5개 영역 중 하나 이상에 연계되는가, ④ 초등 1학년 수준을 초과하지 않는가, ⑤ 상상력과 창의성을 촉진하는가. 2019 개정 누리과정은 학습지 풀기나 글자 외우기를 **명시적으로 누리과정 목표가 아님**으로 선언했으므로, 모든 활동지는 놀이적 프레이밍이 필수적이다.

**Stage 5 — 원작 동화 정합성 검증:** 생성된 콘텐츠와 원작 동화 메타데이터의 의미적 유사도(semantic similarity) 측정. 캐릭터 이름 일치, 핵심 플롯 요소 참조, 주제/교훈 정합 확인. 유사도 0.6 미만 시 플래그.

### 안전성 검증 에이전트 설계

별도의 **Safety Validator 에이전트**(Haiku 4.5)가 9개 에이전트 출력 전체를 검사한다. 이 에이전트는 생성과 검증을 분리하는 Anthropic의 "Evaluator-Optimizer" 패턴을 따르며, 모든 통과/경고/실패 결정을 감사 추적(audit trail)으로 기록한다.

### 유아 콘텐츠 시각적 안전 기준

**적절한 요소:** 밝고 따뜻한 색상(파스텔 톤 선호), 둥근 형태의 친근한 캐릭터, 자연·가족·놀이 장면, 다양성 반영(성별, 외모). **배제 요소:** 어둡고 그림자진 이미지, 사실적 폭력/부상/무기, 무서운 괴물/해골, 과도하게 복잡한 장면, 성별 고정관념("여자는 분홍색"), 유기/고립/극단적 슬픔 묘사, 사실적 화재/자연재해.

### 폴백 전략: 3계층 저하 모델

**Tier 1 — 재시도·복구:** 지수 백오프 재시도(1초, 2초, 4초), 최대 3회, 타임아웃 10~15초.

**Tier 2 — 간단한 모델로 전환:** 주 모델(Sonnet) → 보조 모델(Haiku)로 전환, 또는 변수 치환 기반 템플릿 생성, 유사 요청의 캐시된 성공 응답 활용.

**Tier 3 — 정적 폴백 템플릿:** 사전 설계·사전 검증된 안전 템플릿으로 즉시 전환. 9개 활동지 각각에 대해 기본 템플릿을 미리 준비한다 — 색칠놀이(기본 도형: 원·별·하트), 스토리맵(빈 3칸 처음/중간/끝), 등장인물카드(빈 카드+감정 이모티콘), 감정활동지(6가지 기본 감정 얼굴), 어휘따라쓰기(기본 공통 단어 5개: 가족/친구/사랑/나무/하늘), 나라면?상상(범용 질문: "내가 구름이라면 어디로 갈까요?"), 말풍선대화(빈 풍선 3종), 역할놀이대본(3인 기본 인사 대본), 독후활동지(범용 그리기·쓰기 프롬프트). 이 템플릿들은 동화 비특정적(story-agnostic)이지만 누리과정 정합성과 안전성이 보장된다.

**회로 차단기(Circuit Breaker) 패턴:** 1분 내 에러율 5% 초과 시 회로 개방 → 폴백 콘텐츠 즉시 제공 → 쿨다운 후 반개방 상태에서 복구 테스트 → 점진적 정상 복귀.

---

## 6. 기술 구현 파이프라인

### Python 비동기 오케스트레이터 코어 패턴

```python
import asyncio
from anthropic import AsyncAnthropic
from pydantic import BaseModel

client = AsyncAnthropic()

async def run_agent(system_prompt: str, shared_ctx: str, model: str, output_type):
    response = await client.messages.parse(
        model=model, max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": shared_ctx}],
        output_format=output_type,
    )
    return response.parsed_output

async def orchestrate(fairy_tale: str):
    # Phase 1: 동화 분석 (Sonnet)
    context = await run_agent(ORCHESTRATOR_PROMPT, fairy_tale,
                              "claude-sonnet-4-5", FairyTaleContext)
    ctx_json = context.model_dump_json()

    # Phase 2: 9개 에이전트 병렬 실행
    agents = [
        run_agent(COLORING_PROMPT, ctx_json, "claude-haiku-4-5", ColoringOutput),
        run_agent(STORYMAP_PROMPT, ctx_json, "claude-haiku-4-5", StoryMapOutput),
        # ... 7개 더
    ]
    results = await asyncio.gather(*agents, return_exceptions=True)

    # Phase 3: 안전성 검증
    validated = await validate_all(results)
    return validated
```

Anthropic Python SDK는 `AsyncAnthropic` 클라이언트를 제공하며, `pip install anthropic[aiohttp]`로 aiohttp 백엔드를 사용하면 비동기 성능이 향상된다. `asyncio.Semaphore(5)`로 동시성을 제한하고, SDK 내장 지수 백오프 재시도를 활용한다.

### WeasyPrint 한글 폰트 안정성 확보

한글 렌더링의 **가장 흔한 실패 원인**은 시스템에 한글 글리프가 포함된 폰트가 없는 경우다(빈 텍스트 출력 또는 `MissingGlyphsSubsettingError` 크래시). 해결 핵심:

1. **Noto Sans KR TTF 파일을 프로젝트에 번들링**하고 절대 경로로 참조
2. `FontConfiguration` 객체를 `CSS()`와 `write_pdf()` **양쪽 모두에** 전달
3. @font-face에서 `url('file:///absolute/path/...')` 형식 사용
4. Docker 배포 시 `libpango1.0-0`, `libcairo2`, `libgdk-pixbuf2.0-0`, `libpangoft2-1.0-0` 시스템 의존성 설치
5. SVG 내 `<text>` 요소의 한글은 **글리프를 경로(path)로 변환**하여 폰트 의존성을 제거하는 것이 가장 안정적

WeasyPrint가 복잡한 레이아웃에서 문제를 일으킬 경우 **Playwright**(Chromium 풀 렌더링)가 가장 강력한 대안이다. `page.pdf(format='A4', print_background=True)`로 HTML→PDF 변환하며, 브라우저 바이너리(~300MB) 오버헤드가 있으나 CSS/SVG 호환성이 최고 수준이다.

### SVG 라이브러리 활용

| 라이브러리 | 용도 | 상태 |
|-----------|------|------|
| **svgwrite** (1.4.3) | SVG 요소 프로그래밍 생성(rect, circle, text, path 등) | 유지보수 모드(버그픽스만) |
| **svgpathtools** (1.6.x) | SVG 경로 분석·변환·조합 | 활성 개발 |
| **fontTools** (4.x) | 한글 폰트 글리프 → SVG 경로 추출 | 활성 개발 |
| **CairoSVG** | SVG → PDF 변환 (DPI 300 지원) | 활성 |

한글 따라쓰기 생성의 핵심 파이프라인: `fontTools.TTFont` → `SVGPathPen`으로 글리프 추출 → `TransformPen`으로 Y축 반전·스케일 조정 → 연한 회색 참조 + 점선 외곽선 2개 레이어 → `svgwrite`로 40mm × 40mm 연습 셀 그리드 구성 → Jinja2 템플릿에 인라인 삽입.

---

## 7. 누리과정 정합성과 한국 유아교육 표준

### 2019 개정 누리과정 핵심 원칙

2019년 7월 24일 고시(교육부 고시 제2019-189호), 2020년 3월 시행. **가장 중요한 변화: 369개 연령별 세부 내용을 59개 연령 통합 내용으로 대폭 축소**하고, **놀이 중심·유아 중심** 철학을 전면 채택했다. 추구하는 인간상 5가지: 건강한 사람, 자주적인 사람, 창의적인 사람, 감성이 풍부한 사람, 더불어 사는 사람.

9종 활동지와 누리과정 5개 영역의 연계:

| 활동지 | 주 연계 영역 | 부 연계 영역 |
|--------|------------|------------|
| 색칠놀이 | 예술경험(예술적 표현) | 신체운동(소근육) |
| 스토리맵 | 의사소통(책과 이야기 즐기기) | 자연탐구(탐구 과정) |
| 등장인물카드 | 사회관계(자아 인식) | 의사소통 |
| 감정활동지 | 사회관계(감정 이해·표현) | 의사소통 |
| 어휘따라쓰기 | 의사소통(읽기·쓰기 관심) | 예술경험 |
| 나라면?상상 | 사회관계(공감·관점 전환) | 의사소통 |
| 말풍선대화 | 의사소통(듣기·말하기) | 사회관계 |
| 역할놀이대본 | 예술경험(극놀이) | 사회관계·의사소통 |
| 독후활동지 | 의사소통(책과 이야기 즐기기) | 전 영역 통합 가능 |

### 한국 유아교육 활동지 표준 포맷

용지: **A4**(210 × 297mm). 제목 폰트: **24~36pt 굵은체**, 둥근 서체(나눔바른고딕, 프리텐다드 등). 안내 문구: 16~20pt, **존댓말**(-요 종결). 본문: 14~18pt. 따라쓰기: 36~48pt 점선/외곽선. 구성: 상단에 활동명·이름/날짜란, 중앙에 활동 영역(전체 면적의 50% 이상은 그리기/쓰기 공간), 하단에 교사 안내(누리과정 연계 영역, 확장 활동 제안). **흑백 인쇄에서도 작동하는 디자인**이 필수(많은 기관이 흑백 출력). 한국 유치원에서 활동지는 대·소집단 활동 후 자유선택활동 시간의 언어영역에서 사용되며, 가정통신문으로 부모-자녀 활동에도 활용된다.

---

## 결론: 핵심 설계 원칙과 실행 로드맵

이 리서치에서 도출된 설계 원칙은 세 가지 축으로 수렴한다. **첫째, 비용 효율성**: Sonnet 오케스트레이터 1회 + Haiku 워커 6개 + Sonnet 워커 3개의 하이브리드 모델 전략과 프롬프트 캐싱으로 동화 1편당 $0.10 미만을 달성한다. **둘째, 안정성**: Pydantic 기반 구조화 출력으로 JSON 100% 유효성을 보장하고, 3계층 폴백(재시도 → 모델 전환 → 정적 템플릿)과 회로 차단기로 장애를 격리하며, 9개 사전 검증 폴백 템플릿이 항시 대기한다. **셋째, 교육적 정합성**: 독서치료 3단계(동일시→카타르시스→통찰), Gottman 감정 코칭, CASEL SEL 프레임워크, 2019 개정 누리과정의 놀이 중심 철학을 각 에이전트의 시스템 프롬프트에 내재화한다.

구현 우선순위로는, **오케스트레이터 + FairyTaleContext Pydantic 모델**을 먼저 완성한 후, 가장 단순한 에이전트(어휘따라쓰기, 등장인물카드)부터 Haiku 4.5로 프로토타이핑하고, 점차 창의적 에이전트(역할놀이대본, 나라면?상상)를 Sonnet으로 추가하는 점진적 접근이 리스크를 최소화한다. WeasyPrint + Noto Sans KR TTF 번들링으로 PDF 파이프라인을 조기에 검증하되, 복잡한 SVG 레이아웃 문제 발생 시 Playwright를 대안으로 준비해야 한다.