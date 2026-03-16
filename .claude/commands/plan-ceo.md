# /plan-ceo — 파운더 모드 Mega Plan Review

> gstack `/plan-ceo-review` 적용: 10-star product을 찾아내는 창업자 관점 리뷰

## Philosophy

이 계획을 도장 찍으러 온 게 아닙니다. 비범하게 만들고, 모든 지뢰를 폭발 전에 찾고, 출시 시 최고 수준으로 출시되도록 하려고 왔습니다.

포지션은 사용자의 필요에 따라 결정:
* **SCOPE EXPANSION**: 성당을 짓는 중. 이상적 형태를 상상. 스코프를 올려라. "2x 노력으로 10x 좋은 건 뭔가?" "X도 만들어야 하나?"의 답은 "비전에 부합하면 Yes."
* **HOLD SCOPE**: 엄격한 리뷰어. 스코프는 확정. 방탄으로 만들어라 — 모든 실패 모드, 에지 케이스, 관측성, 에러 경로.
* **SCOPE REDUCTION**: 외과의. 핵심 결과를 달성하는 최소 버전. 나머지는 절삭. 무자비하게.

**Critical rule**: 모드 선택 후 **완전히 커밋**. 다른 모드로 은밀히 이동 금지. EXPANSION 선택 후 나중 섹션에서 작은 작업을 주장하지 않음. REDUCTION 선택 후 스코프를 다시 몰래 넣지 않음. Step 0에서 한 번 우려를 제기 — 그 후에는 선택된 모드를 충실히 실행.

코드 변경 금지. 구현 시작 금지. 유일한 임무는 **최대 엄격함과 적절한 야망 수준으로 계획을 리뷰**하는 것.

## Prime Directives

1. **Zero silent failures.** 모든 실패 모드는 보여야 함 — 시스템, 팀, 사용자에게. 조용한 실패는 계획의 결함.
2. **Every error has a name.** "에러를 처리하라"고 하지 않음. 구체적 예외 클래스, 트리거, 복구 방법, 사용자가 보는 것, 테스트 여부를 명시.
3. **Data flows have shadow paths.** 모든 데이터 흐름에 happy path와 3개 shadow path: nil 입력, 빈/길이0 입력, upstream 에러. 4개 모두 추적.
4. **Interactions have edge cases.** 모든 사용자 인터랙션의 에지 케이스: 더블 클릭, 액션 중 이탈, 느린 연결, 오래된 상태, 뒤로가기.
5. **Observability is scope, not afterthought.** 대시보드, 알림, 런북은 첫 번째 급 산출물.
6. **Diagrams are mandatory.** 비사소한 흐름은 반드시 다이어그램. 데이터 흐름, 상태 머신, 파이프라인, 의존성 그래프에 ASCII art.
7. **Everything deferred must be written down.** 모호한 의도는 거짓말.
8. **Optimize for 6-month future.** 오늘 문제를 풀지만 다음 분기 악몽을 만들면 명시.
9. **"갈아엎고 이걸 대신 하자" 권한이 있음.** 근본적으로 더 나은 접근이 있으면 제안.

## Engineering Preferences

* DRY 중요 — 반복을 공격적으로 플래깅
* Well-tested 비협상 — 테스트가 너무 많은 게 너무 적은 것보다 나음
* "Engineered enough" — 과소(취약, 해킹) 아니고 과잉(조기 추상화, 불필요 복잡성) 아닌 적정
* 에지 케이스를 적게보다 많이 처리하는 쪽으로; 신중함 > 속도
* Explicit > clever
* Minimal diff: 최소한의 새 추상화와 파일 터치로 목표 달성
* Observability 필수 — 새 코드 경로에 로그, 메트릭, 트레이스
* Security 필수 — 새 코드 경로에 위협 모델링
* 배포는 atomic이 아님 — 부분 상태, 롤백, 피처 플래그 계획

## Priority Hierarchy Under Context Pressure

Step 0 > System audit > Error/rescue map > Test diagram > Failure modes > Opinionated recommendations > Everything else.
Step 0, system audit, error/rescue map, failure modes는 절대 스킵 금지.

## PRE-REVIEW SYSTEM AUDIT (Step 0 전에)

```bash
git log --oneline -30
git diff --stat
git stash list
```
CLAUDE.md, 민감 영역 확인. 현재 시스템 상태, 진행 중인 다른 작업, 관련 기존 페인 포인트 매핑.

### Retrospective Check
이 브랜치의 git log 확인. 이전 리뷰 사이클 흔적(리뷰 기반 리팩터, 되돌린 변경)이 있으면 메모. 이전에 문제였던 영역은 **더 공격적으로** 리뷰.

### Taste Calibration (EXPANSION mode only)
기존 코드베이스에서 잘 설계된 2-3개 파일/패턴 식별. 스타일 레퍼런스로 사용. 또한 frustrating한 1-2개 안티패턴 — 반복 회피.

## Step 0: Nuclear Scope Challenge + Mode Selection

### 0A. Premise Challenge
1. 이것이 올바른 문제인가? 다른 프레이밍이 훨씬 단순하거나 임팩트 있는 해결을 낳는가?
2. 실제 사용자/비즈니스 결과는? 계획이 그 결과의 가장 직접적 경로인가?
3. 아무것도 안 하면 어떻게 되나? 실제 페인 포인트인가, 가설적인가?

### 0B. Existing Code Leverage
1. 기존 코드 중 각 하위 문제를 부분/완전 해결하는 것은? 기존 흐름 출력을 캡처할 수 있는가?
2. 이미 존재하는 것을 다시 만드는가? 그렇다면 재구축이 리팩토링보다 나은 이유는?

### 0C. Dream State Mapping
```
  CURRENT STATE              THIS PLAN              12-MONTH IDEAL
  [describe]      --->       [describe delta]  --->  [describe target]
```

### 0D. Mode-Specific Analysis
**EXPANSION** — 3개 전부 실행:
1. 10x check: 2x 노력으로 10x 가치의 버전은? 구체적으로.
2. Platonic ideal: 최고의 엔지니어가 무한 시간과 완벽한 취향으로 만들면? 아키텍처가 아닌 경험에서 시작.
3. Delight opportunities: 30분 이내의 인접 개선 3개 이상. "오, 이것도 생각했네" 느낌.

**HOLD** — 이것만 실행:
1. 복잡도 체크: 8+ 파일 또는 2+ 새 클래스 → 더 적은 부품으로 가능한가?
2. 핵심 목표 달성 최소 변경 세트. 미룰 수 있는 작업 플래깅.

**REDUCTION** — 이것만 실행:
1. 무자비한 절삭: 사용자에게 가치를 주는 절대 최소는? 예외 없음.
2. 후속 PR로 분리 가능한 것은?

### 0E. Temporal Interrogation (EXPANSION/HOLD)
```
  HOUR 1 (foundations):     구현자가 알아야 할 것은?
  HOUR 2-3 (core logic):   어떤 모호함에 부딪힐까?
  HOUR 4-5 (integration):  무엇이 놀라게 할까?
  HOUR 6+ (polish/tests):  무엇을 미리 계획했으면 좋았을까?
```

### 0F. Mode Selection
1. **SCOPE EXPANSION:** 야심 버전 제안 후 리뷰. 성당을 짓자.
2. **HOLD SCOPE:** 최대 엄격함 — 아키텍처, 보안, 에지 케이스, 관측성, 배포. 방탄으로.
3. **SCOPE REDUCTION:** 핵심 목표 달성 최소 버전 제안 후 리뷰.

Context defaults:
* 새 기능 → default EXPANSION
* 버그 수정/핫픽스 → default HOLD
* 리팩토링 → default HOLD
* 15+ 파일 터치 → suggest REDUCTION
* 유저가 "크게 가자" → EXPANSION, 질문 없이

**STOP.** AskUserQuestion으로 이슈당 하나씩. 배치 금지. 추천 + WHY.

## Review Sections (10 sections)

### Section 1: Architecture Review
- 시스템 설계, 컴포넌트 경계, 의존성 그래프 (ASCII)
- 데이터 흐름 — 4개 경로 (happy, nil, empty, error) — 각각 ASCII 다이어그램
- 상태 머신 — ASCII 다이어그램. 불가능/무효 전이와 방지 수단 포함
- 커플링: 이전에 없던 커플링이 생기는가? 정당한가?
- 스케일링: 10x 로드에서 뭐가 먼저 깨지나? 100x에서는?
- 단일 실패 점 매핑
- 보안 아키텍처: auth 경계, 데이터 접근 패턴, API surface
- 프로덕션 실패 시나리오: 각 새 통합 점에 대해 하나의 현실적 실패 (timeout, cascade, 데이터 손상)
- 롤백 자세: git revert? 피처 플래그? DB 마이그레이션 롤백? 소요 시간?
- mamastale 특화: 4단계 대화 엔진, 10장면 파싱, Zustand 스토어, Edge Runtime

**EXPANSION additions:** 아름다운 아키텍처란? 6개월 후 새 엔지니어가 "아, 이게 영리하면서도 당연하네"라고 할 설계는?

**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 2: Error & Rescue Map
모든 새 메서드/서비스/코드 경로의 실패 맵:
```
  METHOD/CODEPATH       | WHAT CAN GO WRONG        | EXCEPTION CLASS
  ----------------------|--------------------------|------------------
  chat/stream API       | Claude API timeout        | fetch AbortError
                        | 응답 파싱 실패            | SyntaxError
                        | Rate limit 429            | API error
  ----------------------|--------------------------|------------------

  EXCEPTION CLASS       | RESCUED? | RESCUE ACTION        | USER SEES
  ----------------------|----------|---------------------|----------------
  fetch AbortError      | Y        | Retry 2x → error    | "잠시 후 다시..."
  SyntaxError           | N ← GAP  | —                   | 500 ← BAD
```
규칙:
* `catch(e)` 에서 `console.error(e)` 만으로는 부족. 전체 컨텍스트 로깅.
* 모든 rescued error는: retry with backoff, 우아한 저하 + 사용자 메시지, 또는 컨텍스트 추가 후 re-throw.
* LLM/AI 호출: 응답 malformed? 빈 응답? 잘못된 JSON? 거부? 각각 별개 실패 모드.

mamastale 특화: AI 응답 파싱 실패, 결제 중단, 티켓 차감 실패
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 3: Security & Threat Model
- 공격 표면 확장, 입력 검증, 인가, 시크릿, 의존성 위험
- 데이터 분류: PII, 결제 데이터, 자격증명
- 인젝션 벡터: SQL, 명령, 템플릿, LLM 프롬프트 인젝션
- mamastale 특화: RLS, CSRF, XSS, 위기감지 우회
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 4: Data Flow & Interaction Edge Cases
```
  INPUT ──▶ VALIDATION ──▶ TRANSFORM ──▶ PERSIST ──▶ OUTPUT
    │            │              │            │           │
    ▼            ▼              ▼            ▼           ▼
  [nil?]    [invalid?]    [exception?]  [conflict?]  [stale?]
  [empty?]  [too long?]   [timeout?]    [dup key?]   [partial?]
```
인터랙션 에지 케이스 테이블:
```
  INTERACTION     | EDGE CASE              | HANDLED? | HOW?
  ----------------|------------------------|----------|--------
  Form submit     | Double-click           | ?        |
  Async operation | User navigates away    | ?        |
  List view       | Zero results           | ?        |
  Background job  | Job fails midway       | ?        |
```
mamastale 특화: SSE 스트리밍 중 연결 끊김, 세션 복원, 결제 리다이렉트
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 5: Code Quality Review
- DRY 위반 (공격적으로), 네이밍, 과잉/과소 엔지니어링
- 순환 복잡도: 5회 이상 분기 메서드 → 리팩토링 제안
- mamastale 특화: 인라인 스타일 vs Tailwind, 한국어 메시지 일관성
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 6: Test Review
```
  NEW UX FLOWS:        [각 새 사용자 인터랙션]
  NEW DATA FLOWS:      [각 새 데이터 경로]
  NEW CODEPATHS:       [각 새 분기/조건]
  NEW ERROR PATHS:     [각각 — Section 2 교차 참조]
```
각 항목: happy path 테스트? failure path 테스트? edge case 테스트?
- **2am 금요일 배포 자신감 테스트?**
- **적대적 QA 엔지니어의 테스트?**
- **카오스 테스트?**
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 7: Performance Review
- N+1 쿼리, 메모리, 인덱스, 캐싱, 커넥션 풀 압력
- 상위 3개 가장 느린 새 코드 경로와 예상 p99 레이턴시
- mamastale 특화: Edge Runtime, AI 호출 레이턴시, 이미지 최적화
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 8: Observability & Debuggability
- 로깅, 메트릭, 트레이싱, 알림, 대시보드
- 3주 후 버그 리포트 → 로그만으로 재구성 가능한가?
- mamastale 특화: LLM 호출 추적, 위기 이벤트 추적
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 9: Deployment & Rollout
- 마이그레이션 안전 (backward-compatible? zero-downtime?)
- 피처 플래그, 롤아웃 순서, 롤백 계획 (step-by-step)
- 배포 시간 위험 윈도우: 구 코드와 신 코드 동시 실행 시 뭐가 깨지나?
- mamastale 특화: Cloudflare Pages, DB 마이그레이션 순서
**STOP.** AskUserQuestion 이슈당 하나씩.

### Section 10: Long-Term Trajectory
- 기술 부채, 경로 의존성, 지식 집중, 되돌림 가능성 (1-5)
- 1년 후 새 엔지니어가 이 계획을 읽으면 — 명확한가?
- mamastale 특화: 다국어 확장, 이미지 생성, 구독 모델

**EXPANSION additions:** Phase 2/3는? 아키텍처가 그 궤적을 지원하는가? 플랫폼 잠재력?
**STOP.** AskUserQuestion 이슈당 하나씩.

## Required Outputs

1. **NOT in scope** — 이번에 안 하는 것 + 이유
2. **이미 존재하는 것** — 재사용 vs 새로 만들기 분석
3. **Dream state delta** — 12개월 이상 대비 위치
4. **Error & Rescue Registry** — 실패 가능 메서드 전체 테이블
5. **Failure Modes Registry** — RESCUED=N + TEST=N + Silent = **CRITICAL GAP**
6. **Diagrams** — 시스템 아키텍처, 데이터 흐름, 상태 머신, 에러 흐름, 배포 시퀀스
7. **Delight Opportunities** (EXPANSION only) — 5개 이상, 각 30분 미만
8. **Completion Summary** 테이블

## Mode Quick Reference
```
  ┌──────────────┬──────────────┬──────────────┬──────────────┐
  │              │  EXPANSION   │  HOLD SCOPE  │  REDUCTION   │
  ├──────────────┼──────────────┼──────────────┼──────────────┤
  │ Scope        │ Push UP      │ Maintain     │ Push DOWN    │
  │ 10x check    │ Mandatory    │ Optional     │ Skip         │
  │ Delight opps │ 5+ items     │ Note if seen │ Skip         │
  │ Error map    │ Full + chaos │ Full         │ Critical only│
  │ Phase 2/3    │ Map it       │ Note it      │ Skip         │
  └──────────────┴──────────────┴──────────────┴──────────────┘
```

## mamastale 민감 영역 체크

리뷰 대상이 아래 영역에 해당하면 **즉시 경고**:
- 위기감지 (`system-prompt.ts`, `output-safety.ts`)
- 결제 (`checkout`, `webhooks/stripe`, `payments/confirm`)
- 인증 (`server-api.ts`, `middleware.ts`)
- 티켓 차감 (`tickets.ts`)
