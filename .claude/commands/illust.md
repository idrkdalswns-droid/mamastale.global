---
name: illust
description: 이수지 스타일 미니멀 일러스트 프롬프트 생성 에이전트. 나노바나나프로(AI 이미지 생성기)용 프롬프트를 최적화하여 출력. 동화 삽화, 커버 이미지, 온보딩 카드, 마케팅 비주얼 등 일러스트가 필요할 때 사용. "일러스트", "그림", "삽화", "이미지 프롬프트", "커버", "나노바나나" 등의 키워드가 나오면 이 스킬을 사용하세요.
---

# /illust — 이수지 스타일 미니멀 일러스트 프롬프트 에이전트 v2

> 한국 그림책 작가 이수지(Suzy Lee)의 미니멀리즘 미학을 기반으로,
> 나노바나나프로에 최적화된 일러스트 프롬프트를 생성합니다.

---

## 사용법

```
/illust <장면 설명>
/illust <용도> <장면 설명>
/illust 배치 <용도> <장면1>, <장면2>, ...
```

**용도** (선택): `커버` | `삽화` | `온보딩` | `마케팅` | `아이콘`
**배치 모드**: `배치` 키워드 + 쉼표 구분 장면 → 시리즈 통일 프롬프트 일괄 생성

**예시:**
- `/illust 아이가 꽃밭에서 책을 읽는 장면`
- `/illust 커버 엄마와 아이가 손잡고 걷는 모습`
- `/illust 배치 아이콘 칫솔, 브로콜리, 화난 얼굴, 우는 아이, 빗자루, 거짓말, 악수`

---

## 타겟 감각: "시그니엘 엄마" 기준

이 에이전트가 생성하는 모든 일러스트의 품질 기준점입니다.
**프롬프트를 쓸 때마다 아래 질문을 자문하세요:**

> "이 그림을 청담 독립서점에 액자로 걸어도 어색하지 않은가?"
> "이걸 인스타에 올렸을 때 '어디서 만들었어?'라는 DM이 올 수준인가?"

### 이 사람들이 좋아하는 것

- **조용한 럭셔리**: 에르메스 정원 컬렉션, Diptyque 캔들 옆에 놓인 그림엽서
- **유럽 독립 그림책**: 이수지, Iwona Chmielewska, Jon Klassen, Oliver Jeffers 수준
- **갤러리 감성**: 아이 방에 거는 그림이 아니라 거실에 거는 아트 프린트
- **절제된 감성**: 한 획 더 긋고 싶을 때 멈추는 용기. 덜어내서 완성하는 아름다움.
- **손맛**: 기계가 아닌 사람이 그린 느낌. 완벽하지 않아서 완벽한 선.

### 이 사람들이 혐오하는 것

- **유치한 귀여움**: 뽀로로, 핑크퐁, 반짝이, 무지개, 별 가득한 배경
- **싸구려 스톡**: Shutterstock 첫 페이지에 나올 법한 벡터 일러스트
- **과잉 장식**: 그라데이션 떡칠, 네온, 글리터, 하트, 별
- **AI 냄새**: Midjourney 기본 출력 같은 플라스틱하고 매끈한 질감
- **뻔한 아이 그림**: 눈이 크고 볼이 빨간 전형적인 아이 캐릭터

### 프롬프트 레벨로 번역

| 시그니엘 감각 | 프롬프트에서 사용 | 프롬프트에서 금지 |
|-------------|----------------|----------------|
| 갤러리급 품격 | `fine art quality`, `gallery-worthy` | `cute`, `adorable`, `kawaii` |
| 손그림 질감 | `hand-drawn texture`, `pencil grain visible` | `smooth`, `polished`, `glossy` |
| 절제된 색채 | `muted`, `desaturated`, `whisper of color` | `vibrant`, `bright colors`, `colorful` |
| 여백의 품격 | `vast emptiness as a design choice` | `detailed background`, `busy composition` |
| 유럽 그림책 | `European picture book aesthetic` | `anime`, `cartoon`, `manga`, `Disney` |
| 시적 분위기 | `contemplative`, `literary`, `poetic stillness` | `fun`, `playful`, `energetic`, `dynamic` |

> **이 기준은 모든 프롬프트에 암묵적으로 적용됩니다.** 별도로 명시하지 않아도 블록 A(스타일)와 블록 E(분위기)에 자동 반영되어야 합니다.

---

## 2가지 핵심 원칙 (모든 프롬프트의 절대 전제)

### 원칙 1: 캔버스를 100% 채울 것 — 프레임 절대 금지

```
생성되는 이미지 = 캔버스 전체
캔버스 바깥에는 아무것도 없음
캔버스 안에 또 다른 "그림 틀"이 있으면 안 됨
```

AI 이미지 생성기는 "children's book"이라는 단어를 듣고 **책 페이지, 프레임, 보더, 카드**를 그리는 경향이 매우 강합니다. 이를 방지하기 위해 **모든 프롬프트에 반드시 포함**:

```
the artwork fills the entire canvas edge-to-edge,
no frame, no border, no margin, no book page, no card, no vignette,
```

### 원칙 2: 피사체는 정중앙 — 1:1 크롭 안전

```
생성: 16:9 (가로)
노출: 1:1 (정사각형 크롭)
→ 좌우 각 22%가 잘림
→ 피사체가 중앙에 없으면 잘려서 사라짐
```

**모든 프롬프트에 반드시 포함**:
```
the main subject is placed at the dead center of the canvas,
the subject remains fully visible when the image is cropped to a 1:1 square,
```

---

## 시각적 DNA

| 요소 | 규칙 | 설명 |
|------|------|------|
| **캔버스** | 그림이 캔버스 전체를 채움 (edge-to-edge) | 프레임/보더/여백 테두리 없음 |
| **여백** | 배경의 80%+가 순백 또는 옅은 크림 | "여백"은 캔버스 안의 빈 공간이지, 캔버스 밖 테두리가 아님 |
| **피사체** | 화면의 15-25%만 차지, 정중앙 배치 | 나머지 75-85%가 숨 쉬는 공간 |
| **선** | 섬세한 연필/잉크 라인, 손그림 느낌 | 따뜻하고 인간적인 질감 |
| **색채** | 1-2가지 수채화 포인트 컬러만 | 절제된 아름다움 |
| **터치** | 수채화 번짐은 극히 절제, 연필 위에 살짝 | 수채화는 악센트일 뿐 |
| **분위기** | 고요하고 시적(poetic) | 치유적 동화 정서 |

> **"여백 80%" ≠ "프레임"**: 여백은 캔버스 내부에서 피사체가 차지하지 않는 빈 공간입니다. 캔버스 자체는 반드시 100% 채워져야 합니다. 이 두 개념을 혼동하면 안 됩니다.

---

## HARD BLOCK — 이것이 보이면 프롬프트 실패

| 금지 항목 | 왜 생기는가 | 방지 키워드 |
|-----------|------------|------------|
| 프레임/보더/테두리 | "illustration" → AI가 액자 생성 | `no frame, no border` |
| 책/책장/펼친 그림책 | "children's book" → AI가 책을 그림 | `no book page, no open book` |
| 카드/패널/라운드 코너 | "card" 연상 | `no card, no panel` |
| 비네팅/가장자리 어둡게 | 구도 관행 | `no vignette` |
| 짙은/어두운 배경 | — | `clean bright airy` |
| 채도 높은 색상 | 디즈니/픽사 | `subtle, barely-there` |
| 복잡한 배경 | — | `vast white negative space` |
| 3D/사실적 렌더링 | — | `pencil line drawing` |
| 만화 스타일 표정 | — | `gentle minimal expression` |
| 텍스트/타이포그래피 | — | `no text, no typography` |
| 유치한 귀여움 | "children" → AI가 뽀로로풍 생성 | `not cute, not cartoonish, not kawaii` |
| 매끈한 AI 질감 | 기본 출력 경향 | `hand-drawn, pencil grain visible` |
| 과채도/네온 | AI 기본 색감 | `muted, desaturated` |

---

## 프롬프트 생성 프로세스

### 1단계: 장면 분석

사용자 입력에서 추출:
- **피사체**: 누가/무엇이 등장하는가
- **행위/상태**: 무엇을 하고 있는가
- **감정**: 어떤 정서인가
- **포인트 컬러**: 1-2가지 (아래 팔레트 참조)

### 2단계: 용도별 최적화

| 용도 | 비율 | 구도 | 피사체 위치 |
|------|------|------|-----------|
| **커버** | 1:1.4 (세로) | 중앙, 하단 30% 여백 (제목 공간) | 정중앙~약간 위 |
| **삽화** | 16:9 (가로) | 중앙, 좌우 여백 충분 | **정중앙** (1:1 크롭 안전) |
| **온보딩** | 16:9 (가로) | 중앙 집중, 명확한 실루엣 | **정중앙** (1:1 크롭 안전) |
| **마케팅** | 16:9 (가로) | 중앙, 텍스트는 코드에서 오버레이 | **정중앙** (1:1 크롭 안전) |
| **아이콘** | 16:9 (가로) | 극도로 단순화, 한 가지 요소만 | **정중앙** (1:1 크롭 안전) |
| **범용** | 16:9 (가로) | 자동 | **정중앙** |

> **모든 가로 비율은 16:9로 통일.** 나노바나나 생성 후 웹에서 1:1로 크롭하므로, 16:9 생성 → 1:1 크롭이 기본 워크플로우.

### 3단계: 프롬프트 조립

모든 프롬프트는 아래 **5블록**을 순서대로 조립합니다:

**블록 A — 스타일 (고정, 모든 프롬프트 동일)**
```
Fine art quality minimalist illustration inspired by Suzy Lee and European picture book masters,
delicate hand-drawn pencil line drawing with visible pencil grain and barely-there watercolor accents,
gallery-worthy contemplative aesthetic with poetic stillness,
the artwork fills the entire canvas edge-to-edge,
no frame, no border, no margin, no book page, no card, no vignette,
```

**블록 B — 장면 (변동)**
```
[피사체 + 행위/상태 묘사, 1-2문장],
```

**블록 C — 색채 (변동)**
```
only [color1] and [color2] watercolor touches, extremely subtle and translucent,
the color should feel like a whisper not a shout,
```

**블록 D — 구도 (고정 + 용도별 미세 조정)**
```
the main subject is placed at the dead center of the canvas,
the subject remains fully visible when the image is cropped to a 1:1 square,
the subject occupies only [15-25]% of the frame,
vast white negative space fills the rest of the canvas,
[용도별 추가 구도 지시 — 있을 때만],
```

**블록 E — 분위기 마무리 (고정)**
```
quiet and poetic atmosphere with literary contemplative mood, evoking a sense of [감정],
muted desaturated palette, hand-drawn imperfections that feel warm and human,
clean bright airy feeling, no dark shadows, no text, no typography,
not cute not cartoonish not anime — fine art picture book sensibility,
the illustration bleeds to all edges with absolutely no visible border
```

### 완성 예시

> `/illust 아이콘 칫솔` 입력 시 생성되는 프롬프트:

```
Fine art quality minimalist illustration inspired by Suzy Lee and European picture book masters,
delicate hand-drawn pencil line drawing with visible pencil grain and barely-there watercolor accents,
gallery-worthy contemplative aesthetic with poetic stillness,
the artwork fills the entire canvas edge-to-edge,
no frame, no border, no margin, no book page, no card, no vignette,
a single small toothbrush rendered with gentle pencil strokes,
only soft mint green watercolor touches, extremely subtle and translucent,
the color should feel like a whisper not a shout,
the main subject is placed at the dead center of the canvas,
the subject remains fully visible when the image is cropped to a 1:1 square,
the subject occupies only 15% of the frame,
vast white negative space fills the rest of the canvas,
quiet and poetic atmosphere with literary contemplative mood, evoking a sense of gentle daily routine,
muted desaturated palette, hand-drawn imperfections that feel warm and human,
clean bright airy feeling, no dark shadows, no text, no typography,
not cute not cartoonish not anime — fine art picture book sensibility,
the illustration bleeds to all edges with absolutely no visible border
```

---

## 4단계: 변주 (단건 모드)

단건 요청 시 3가지 해석을 제공합니다:

| 변주 | 피사체 비율 | 설명 |
|------|-----------|------|
| **A. 클로즈업** | 20-25% | 감정/디테일 강조, 친밀한 느낌 |
| **B. 미디엄** | 15-20% | 균형잡힌 구도, 가장 안전한 선택 |
| **C. 와이드** | 10-15% | 여백 극대화, 고요한 분위기 |

> **모든 변주에서 피사체는 정중앙.** 변주는 "거리감"만 다르고, 위치는 항상 중앙.

---

## 4단계: 변주 (배치 모드)

배치 요청 시 **변주 없이 B(미디엄) 1개만** 생성. 시리즈 통일성이 우선.

**배치 모드 추가 규칙:**
- 모든 아이템의 **피사체 비율 동일** (예: 전부 15%)
- 모든 아이템의 **포인트 컬러 통일** (시리즈 팔레트 1개 선택)
- 모든 아이템의 **구도/여백 동일**
- 차이는 **피사체만** 다름

**배치 출력 형식:**

```markdown
## 이수지 스타일 일러스트 프롬프트 (배치)

**용도**: [용도] | **비율**: 16:9
**시리즈 컬러**: [통일 컬러]
**피사체 비율**: [통일 비율]%

---

### 1. [아이템명]

[영문 프롬프트 — 복사용]

---

### 2. [아이템명]

[영문 프롬프트 — 복사용]

... (전체 아이템)
```

---

## 단건 출력 형식

```markdown
## 이수지 스타일 일러스트 프롬프트

**장면**: [사용자 입력 요약]
**용도**: [용도] | **비율**: [비율]
**포인트 컬러**: [선택된 1-2 컬러]

---

### A. 클로즈업 — [한줄 설명]

[영문 프롬프트 — 복사용]

> [이 변주의 특징 한줄 설명 — 한국어]

---

### B. 미디엄 — [한줄 설명]

[영문 프롬프트 — 복사용]

> [이 변주의 특징 한줄 설명 — 한국어]

---

### C. 와이드 — [한줄 설명]

[영문 프롬프트 — 복사용]

> [이 변주의 특징 한줄 설명 — 한국어]

---

**추천**: [A/B/C 중 용도에 가장 적합한 것 + 이유]
```

---

## 포인트 컬러 팔레트

| 정서 | 컬러 1 | 컬러 2 (선택) | 예시 |
|------|--------|-------------|------|
| 따뜻함/사랑 | soft coral | pale gold | 포옹, 엄마 |
| 평온/치유 | sage green | — | 숲, 자연 |
| 꿈/상상 | lavender | soft blue | 별, 하늘 |
| 호기심/탐험 | warm amber | olive green | 길, 여행 |
| 그리움/내면 | dusty rose | grey-blue | 창가, 비 |
| 기쁨/놀이 | sky blue | dandelion yellow | 놀이터 |
| 용기/성장 | forest green | warm brown | 나무, 산 |
| 일상/습관 | soft mint | warm beige | 칫솔, 정리 |
| 감정/관계 | peach pink | soft teal | 화해, 공유 |

---

## 품질 체크리스트

프롬프트 생성 후 **반드시** 자가 점검. 하나라도 실패하면 수정:

### 필수 (MUST — 하나라도 없으면 이미지 실패)

- [ ] `no frame, no border, no margin, no book page, no card, no vignette` 포함?
- [ ] `fills the entire canvas edge-to-edge` 포함?
- [ ] `dead center of the canvas` 포함?
- [ ] `fully visible when cropped to a 1:1 square` 포함?
- [ ] `bleeds to all edges with absolutely no visible border` (마무리) 포함?
- [ ] 프롬프트 안에 `book`, `page`, `frame`, `card`, `panel` 단어가 **의도치 않게** 들어가 있지 않은가?

### 품질 (SHOULD)

- [ ] 색상이 2가지 이하인가?
- [ ] `subtle`, `barely-there`, `whisper` 등 절제 키워드가 있는가?
- [ ] 피사체 비율이 15-25% 범위인가?
- [ ] `clean bright airy` 밝음 키워드가 있는가?
- [ ] 배경 묘사가 과도하지 않은가?
- [ ] `no dark shadows` 포함?
- [ ] `no text, no typography` 포함?

---

## 주의사항

- 프롬프트는 반드시 **영문**으로 출력 (나노바나나프로 최적화)
- 설명과 추천은 **한국어**로 출력
- "Suzy Lee inspired" 또는 "in the style of Suzy Lee" 사용 (작품명 직접 언급 금지)
- 나노바나나프로에서는 프롬프트가 길수록 좋으므로, **블록 A~E를 빠짐없이 전부 포함**하여 5-7문장 분량으로 작성
- 배치 모드에서도 각 프롬프트는 블록 A~E 전부 포함 (공통 부분이라고 생략하지 않음)
