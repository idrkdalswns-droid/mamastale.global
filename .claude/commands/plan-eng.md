# /plan-eng — 엔지니어링 매니저 모드 플랜 리뷰

> gstack `/plan-eng-review` 패턴 적용: 아키텍처, 데이터 흐름, 엣지 케이스, 테스트를 구현 전에 확정

## 핵심 원칙

- **DRY** — 같은 로직 2번 쓰지 않는다
- **Well-tested** — 새 경로에는 반드시 테스트
- **Engineered enough** — 과잉도 과소도 아닌 적정 수준
- **Explicit > Clever** — 영리한 코드보다 명확한 코드
- **Minimal diff** — 변경이 적을수록 좋다

## 다이어그램 필수

- 데이터 흐름, 상태 머신, 파이프라인은 **반드시 ASCII 다이어그램**
- 기존 다이어그램이 있으면 업데이트 (오래된 다이어그램 = 해로움)
- 다이어그램 없이는 구현 승인하지 않음

```
예시:
User → [Chat API] → Claude → [Parser] → Scenes → [DB]
                                  ↓ fail
                            [Error Handler] → Toast
```

## Step 0: 스코프 도전

구현 시작 전 반드시 확인:

### 0A. 기존 코드 활용
```bash
# 관련 기존 코드 검색
grep -r "관련키워드" src/ --include="*.ts" --include="*.tsx" -l
```
- 이미 해결된 하위 문제가 있는가?
- 기존 유틸/훅/컴포넌트를 확장할 수 있는가?

### 0B. 최소 변경
- 8개 이상 파일 수정 → "정말 이렇게 많이 필요한가?" 질문
- 2개 이상 새 클래스/훅 → "기존 것을 확장할 수 없나?" 질문

### 0C. 복잡도 체크
- 새 상태 관리 필요? → Zustand 스토어 추가 검토
- 새 API 엔드포인트 필요? → 기존 엔드포인트 확장 검토
- 새 DB 테이블 필요? → 기존 테이블 컬럼 추가 검토

### 0D. 모드 결정
사용자에게 AskUserQuestion:
- **SCOPE REDUCTION**: "이건 과하다. 핵심만 하자" → 최소 변경으로
- **BIG CHANGE**: "8+ 파일, 새 개념 도입" → 전체 4-Pass 리뷰
- **SMALL CHANGE**: "3파일 이하, 기존 패턴" → 압축 리뷰 (이슈 배치 가능)

## 4-Pass 순차 리뷰

### Pass 1: 아키텍처
- 시스템 설계: 어떤 컴포넌트가 어떤 책임을 지는가?
- 데이터 흐름: 입력 → 처리 → 출력 경로 다이어그램
- 실패 시나리오: 네트워크 끊김, DB 에러, AI 타임아웃
- mamastale 특화:
  - 4단계 대화 엔진 상태 전이 올바른가?
  - Edge Runtime 제약 충족하는가?
  - Supabase RLS 정책과 충돌 없는가?

**이슈 발견 시 → STOP + AskUserQuestion (하나씩)**

### Pass 2: 코드 품질
- DRY 위반: 같은 패턴이 복사되었는가?
- 에러 핸들링: try/catch 빠짐, 사용자 친화적 한국어 메시지
- 엣지 케이스: null, undefined, 빈 배열, 타임아웃
- mamastale 특화:
  - `sanitizeText()` vs `sanitizeSceneText()` 올바른 사용?
  - 한국어 UI 메시지 일관성
  - `break-keep` CSS 적용되었는가?

**이슈 발견 시 → STOP + AskUserQuestion**

### Pass 3: 테스트
- **테스트 다이어그램 필수**: 새 코드 경로마다 테스트 존재 확인
- 커버리지 갭: 어떤 경로가 테스트 안 되는가?
- 적대적 테스트: 악의적 입력, 경계값, 동시 실행
- mamastale 특화:
  - story-parser 새 엣지 케이스 추가?
  - 위기감지 회귀 테스트 영향?
  - 결제 흐름 변경 시 결제 테스트 추가?

```
테스트 다이어그램 예시:
[Happy Path]  ✅ 10-scene story parse
[Edge Case]   ✅ Scene with missing tag
[Error Path]  ❌ AI timeout → no test!  ← 추가 필요
```

**이슈 발견 시 → STOP + AskUserQuestion**

### Pass 4: 성능
- N+1 쿼리: Supabase 호출이 루프 안에 있는가?
- 캐싱: 반복 호출되는 데이터를 캐시하는가?
- 번들 크기: 새 라이브러리 추가 시 크기 확인
- mamastale 특화:
  - AI 호출당 비용/레이턴시 임팩트
  - 이미지 lazy loading 적용?
  - Cloudflare Edge 캐시 활용 가능한가?

## 질문 규칙 (CRITICAL)

```
BIG CHANGE: 하나의 이슈 = 하나의 AskUserQuestion
SMALL CHANGE: 여러 이슈를 하나의 AskUserQuestion에 배치 가능

2~3개 선택지 (A, B, C)
추천 옵션 첫 번째 + "(추천)" 표시
각 옵션에 한 줄 근거
```

## 필수 출력물

1. **NOT in scope** — 미루는 것 + 이유
2. **이미 존재하는 것** — 재사용 분석
3. **테스트 다이어그램** — 모든 새 경로의 테스트 상태
4. **데이터 흐름 다이어그램** — ASCII 아트
5. **실패 모드 목록** — 각각의 처리 방법
6. **완료 요약표** — 4-Pass × 결과

## 민감 영역 경고

변경 대상이 CLAUDE.md의 🔴 민감 영역에 해당하면:
- **즉시 경고** + plan.md 선행 요구
- 위기감지, 결제, 인증, 티켓 시스템
