# AI 도구별 프롬프트 규격 및 캐릭터 일관성 전략

## 목차
1. Midjourney v6 프롬프트 규격
2. DALL-E 3 프롬프트 규격
3. Leonardo AI 프롬프트 규격
4. Stable Diffusion + LoRA 파이프라인
5. Flux.1 프롬프트 규격
6. 캐릭터 일관성 마스터 전략
7. 업스케일링 파이프라인 상세

---

## 1. Midjourney v6 프롬프트 규격

### 기본 구조
```
[스타일 지시] [장면 묘사] [캐릭터 묘사] [구도/무드] --ar 4:3 --v 6.1 --s [0-1000] --c [0-100] --cref [URL] --cw [0-100] --sref [URL] --sw [0-100]
```

### 핵심 파라미터

| 파라미터 | 용도 | 그림책 권장값 |
|---------|------|------------|
| `--ar` | 종횡비 | 4:3 (가로형 스프레드), 3:4 (세로형 단면) |
| `--v` | 모델 버전 | 6.1 (최신) |
| `--s` | 스타일화 강도 | 200~400 (수채화느낌), 0~100 (사실적) |
| `--c` | 카오스/변형도 | 0~10 (일관성 우선), 20~40 (다양성 탐색) |
| `--cref` | 캐릭터 참조 URL | 확정된 캐릭터 이미지 URL |
| `--cw` | 캐릭터 가중치 | 100 (최대 일관성) |
| `--sref` | 스타일 참조 URL | 확정된 스타일 이미지 URL |
| `--sw` | 스타일 가중치 | 60~80 (스타일 유지하면서 장면 변화 허용) |
| `--no` | 네거티브 프롬프트 | realistic, dark, scary, text, watermark |

### 그림책 프롬프트 예시 (Midjourney)
```
Soft watercolor children's picture book illustration. A cheerful baby triceratops 
with round chubby body in soft green, pale yellow belly, three small orange horns, 
and heart-shaped tail tip, discovering a basket of bright red berries in a sunlit 
forest clearing. Warm morning light, gentle shadows, pastel background colors. 
Wide establishing shot, peaceful mood. 
--ar 4:3 --v 6.1 --s 300 --c 5 --cref [캐릭터참조URL] --cw 100 
--sref [스타일참조URL] --sw 70 --no realistic dark scary teeth text watermark
```

### Midjourney 다중 캐릭터 처리
2명 이상 등장 시 각 캐릭터를 `::` 가중치로 분리:
```
baby triceratops in soft green hugging berries::2 
baby stegosaurus in purple standing sadly behind::1.5
--cref [또리URL] [뭉치URL] --cw 100
```

---

## 2. DALL-E 3 프롬프트 규격

### 특징
- 자연어 프롬프트에 가장 충실 (긴 설명 가능)
- 한글 텍스트 렌더링 가능 (표지 제목 등)
- 캐릭터 참조 기능 없음 → 프롬프트 설명에 의존
- 안전 필터가 엄격함

### 프롬프트 전략
```
Create a children's picture book illustration in soft watercolor style.

SCENE: [장면 상세 묘사]

CHARACTER DESCRIPTION (MUST follow exactly):
- Name: Tori
- Species: Baby triceratops
- Body: Round, chubby, soft green (#4CAF50) with pale yellow (#FFF9C4) belly
- Features: Three small orange horns on head, big brown eyes with sparkle, 
  heart-shaped pattern at the tip of tail
- Expression: [이 장면의 표정]
- Pose: [이 장면의 포즈]

COMPOSITION: [구도 지시]
MOOD: [분위기]
STYLE: Soft watercolor, gentle outlines, warm colors, children's book art

DO NOT include: realistic rendering, dark shadows, scary elements, 
sharp edges, any text or writing
```

---

## 3. Leonardo AI 프롬프트 규격

### 핵심 설정
- Model: Leonardo Kino XL 또는 PhotoReal
- Guidance Scale: 7~8 (너무 높으면 부자연스러움)
- Character Reference: ON (참조 이미지 업로드)
- Style Reference: ON

### 프롬프트 구조
```
[스타일] [캐릭터 묘사] [장면] [구도] [분위기]

Negative prompt: realistic, photographic, dark, horror, text, 
watermark, deformed, extra limbs, extra fingers
```

### Leonardo 고유 기능 활용
- **Alchemy**: ON (품질 향상)
- **PhotoReal**: OFF (일러스트 스타일이므로)
- **Tiling**: OFF
- **Image Dimensions**: 1472×1088 (4:3 최적)

---

## 4. Stable Diffusion + LoRA 파이프라인

### LoRA 트레이닝 워크플로우

**1단계: 참조 이미지 준비**
```
필요 이미지: 30~40장
내용 구성:
- 정면 뷰: 8장 (다양한 표정)
- 3/4 뷰: 8장 (다양한 포즈)
- 측면 뷰: 6장
- 후면 뷰: 4장
- 전신 다양한 포즈: 8장
- 다른 캐릭터와 함께: 6장

이미지 규격:
- 해상도: 512×512 또는 768×768
- 배경: 단색 (흰색 또는 연한 회색)
- 스타일: 최종 목표 스타일과 동일
```

**2단계: 캡션 작성**
```
tori_character, baby triceratops, round chubby body, soft green skin, 
pale yellow belly, three small orange horns, heart tail tip, 
[포즈/표정 설명], children's book illustration style, watercolor
```

**3단계: 트레이닝 파라미터**
```
Training Config:
  base_model: "stabilityai/stable-diffusion-xl-base-1.0"
  lora_rank: 32
  learning_rate: 1e-4
  epochs: 15~20
  batch_size: 1
  resolution: 768
  optimizer: "AdamW"
  scheduler: "cosine"
  trigger_word: "tori_character"
```

**4단계: 추론(Inference)**
```
Prompt: "tori_character, baby triceratops, [장면 설명], 
children's picture book illustration, soft watercolor, 
gentle outlines, warm colors"

Negative: "realistic, dark, scary, deformed, extra limbs, 
bad anatomy, text, watermark"

Settings:
  steps: 30~40
  cfg_scale: 7
  sampler: "DPM++ 2M Karras"
  lora_weight: 0.7~0.9
```

---

## 5. Flux.1 프롬프트 규격

### 특징
- 프롬프트 이해도가 매우 높음
- 자연어 지시에 충실
- 텍스트 렌더링 가능
- 캐릭터 일관성: Redux 모델로 이미지 참조 가능

### 프롬프트 구조
```
A soft watercolor children's picture book illustration showing [장면].
The main character Tori is a baby triceratops with [캐릭터 상세].
[구도와 카메라]. [분위기와 조명].
Style: gentle watercolor with soft outlines, 
pastel background, warm and inviting atmosphere.
```

---

## 6. 캐릭터 일관성 마스터 전략

### 일관성 등급별 접근법

**Level 1 — 프롬프트 일관성 (최소 투자)**
- 동일 캐릭터 설명 블록을 모든 프롬프트에 복사
- seed 값 고정 (같은 랜덤 시드 재사용)
- 기대 일관성: 50~65%

**Level 2 — 이미지 참조 일관성 (중간 투자)**
- Midjourney --cref + --cw 100
- Leonardo Character Reference
- Flux Redux
- 기대 일관성: 70~85%

**Level 3 — 모델 트레이닝 일관성 (높은 투자)**
- Stable Diffusion LoRA 트레이닝
- 기대 일관성: 85~95%
- 소요 시간: 트레이닝 1~2시간 + 참조 이미지 준비

**Level 4 — 하이브리드 (최고 일관성)**
- LoRA 기반 생성 + 수동 리터칭
- Photoshop/Procreate로 최종 일관성 보정
- 기대 일관성: 95%+
- 소요 시간: 이미지당 30분~1시간 추가

### 일관성 복구 플로우차트

```
이미지 생성 완료
    │
    ▼
캐릭터 일관성 체크
    │
    ├── PASS (75%+) → 다음 스프레드로
    │
    └── FAIL (<75%)
        │
        ├── 색상 불일치 → 색보정 도구로 수정
        ├── 비율 불일치 → 프롬프트에 비율 강조 후 재생성
        ├── 특징 누락 → 프롬프트에 특징 반복 강조 후 재생성
        ├── 해부학 오류 → 즉시 재생성 (seed 변경)
        └── 전반적 불일치 → 다른 도구로 전환
```

---

## 7. 업스케일링 파이프라인 상세

### 도구별 업스케일링

**Real-ESRGAN (무료, 오픈소스)**
```bash
# 4× 업스케일
realesrgan-ncnn-vulkan -i input.png -o output.png -n realesrgan-x4plus-anime
```
- 장점: 애니메이션/일러스트 스타일에 최적화 모델 존재
- 단점: GPU 필요, 설치 복잡

**Topaz Gigapixel AI (유료)**
- AI 기반 6×까지 확대
- 디테일 보존 최상
- 그림책 일러스트에 매우 적합

**Canva Magic Resize (간편)**
- 웹 기반, 추가 설치 불필요
- 품질은 중간

### 인쇄 해상도 계산

```
목표: A4 크기 (210mm × 297mm) 양면 스프레드 = 420mm × 297mm

필요 해상도 (300 DPI):
  가로: 420mm ÷ 25.4 × 300 = 4,961 pixels
  세로: 297mm ÷ 25.4 × 300 = 3,508 pixels
  
  → 최소 5000 × 3500 pixels

블리드(bleed) 포함 (3mm 사방):
  가로: 426mm ÷ 25.4 × 300 = 5,031 pixels
  세로: 303mm ÷ 25.4 × 300 = 3,579 pixels
  
  → 안전 해상도: 5100 × 3600 pixels
```

### 색 공간 관리

- AI 생성 이미지: sRGB (기본)
- 인쇄용: CMYK 변환 필요
- 화면용: sRGB 유지
- 변환 시 주의: 밝은 초록, 밝은 파랑 계열이 CMYK에서 탁해질 수 있음
- 대안: 디지털 전용이라면 sRGB 유지 권장
