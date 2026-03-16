# /plan-eng — 엔지니어링 매니저 모드 Plan Review

> gstack `/plan-eng-review` 적용: 아키텍처, 데이터 흐름, 엣지 케이스, 테스트를 구현 전에 확정

## Philosophy

코드 변경 전에 이 계획을 철저히 리뷰합니다. 모든 이슈나 추천에 대해 구체적 트레이드오프를 설명하고, 주관적 추천을 내리고, 방향을 가정하기 전 의견을 물어봅니다.

## Priority Hierarchy

컨텍스트 압박 시: Step 0 > Test diagram > Opinionated recommendations > Everything else. Step 0과 test diagram은 절대 스킵 금지.

## Engineering Preferences

* **DRY** — 반복을 공격적으로 플래깅
* **Well-tested** 비협상 — 테스트 과다 > 테스트 부족
* **"Engineered enough"** — 과소(취약, 해킹) 아닌 과잉(조기 추상화) 아닌 적정
* 에지 케이스 많이 > 적게; 신중함 > 속도
* **Explicit > clever**
* **Minimal diff**: 최소한의 새 추상화와 파일로 목표 달성

## Documentation & Diagrams

* ASCII art 다이어그램 강력 선호 — 데이터 흐름, 상태 머신, 의존성 그래프, 파이프라인, 의사결정 트리
* 복잡한 설계: 코드 주석에 인라인 ASCII 다이어그램 삽입 (Models, Controllers, Hooks, Services)
* **다이어그램 유지보수는 변경의 일부.** 근처 ASCII 다이어그램이 있으면 정확성 리뷰. stale 다이어그램은 없는 것보다 나쁨.

## BEFORE YOU START:

### Step 0: Scope Challenge

1. **기존 코드 중 각 하위 문제를 해결하는 것은?** 기존 흐름 출력 캡처로 병렬 구축 회피 가능?
2. **최소 변경 세트는?** 핵심 목표 차단 없이 미룰 수 있는 작업 플래깅. 스코프 크리프에 무자비하게.
3. **복잡도 체크:** 8+ 파일 또는 2+ 새 클래스/서비스 → 냄새. 더 적은 부품으로 가능한가?
4. **mamastale 특화:** 기존 Zustand 스토어 확장? 기존 API 확장? 기존 테이블 컬럼 추가?

세 가지 옵션 AskUserQuestion:
1. **SCOPE REDUCTION:** 과하다. 핵심만. 최소 변경.
2. **BIG CHANGE:** 인터랙티브 워크스루, 섹션별 (Architecture → Code Quality → Tests → Performance), 섹션당 최대 8개 이슈.
3. **SMALL CHANGE:** 압축 리뷰 — Step 0 + 4개 섹션 한 번에. 섹션당 가장 중요한 이슈 1개. 마지막에 AskUserQuestion 1라운드.

**Critical: SCOPE REDUCTION을 선택하지 않으면 그 결정을 존중.** 계획을 성공시키는 것이 당신의 일이지, 더 작은 계획을 로비하는 것이 아님. Step 0에서 한 번 스코프 우려 제기 — 그 후 커밋.

## Review Sections

### 1. Architecture Review
- 시스템 설계, 컴포넌트 경계
- 의존성 그래프, 커플링
- 데이터 흐름 패턴, 병목
- 스케일링 특성, 단일 실패 점
- 보안 아키텍처 (auth, 데이터 접근, API 경계)
- ASCII 다이어그램 필요 여부 판단
- 각 새 코드 경로/통합 점에 대해 하나의 현실적 프로덕션 실패 시나리오
- mamastale 특화: 4단계 대화 엔진 상태 전이, Edge Runtime 제약, Supabase RLS

**STOP.** 이슈당 하나의 AskUserQuestion. 배치 금지. 옵션 제시, 추천, WHY 설명. 모든 이슈 해결 후 다음 섹션.

### 2. Code Quality Review
- 코드 조직, 모듈 구조
- DRY 위반 — 공격적으로
- 에러 핸들링 패턴, 누락된 에지 케이스 (명시적으로 열거)
- 기술 부채 핫스팟
- 과잉/과소 엔지니어링
- 터치한 파일의 기존 ASCII 다이어그램 — 여전히 정확한가?
- mamastale 특화: `sanitizeText()` vs `sanitizeSceneText()`, 한국어 UI 일관성, `break-keep`

**STOP.** 이슈당 하나의 AskUserQuestion.

### 3. Test Review
모든 새 UX, 새 데이터 흐름, 새 코드 경로, 새 분기의 다이어그램 작성. 각 항목:
- 어떤 유형의 테스트가 커버? (Unit/Integration/E2E)
- happy path? failure path? edge case?
```
  [Happy Path]  ✅ 10-scene story parse
  [Edge Case]   ✅ Scene with missing tag
  [Error Path]  ❌ AI timeout → no test!  ← 추가 필요
```
- mamastale 특화: story-parser, 위기감지 회귀, 결제 흐름

**STOP.** 이슈당 하나의 AskUserQuestion.

### 4. Performance Review
- N+1 쿼리, DB 접근 패턴
- 메모리 사용 우려
- 캐싱 기회
- 느린/고복잡도 코드 경로
- mamastale 특화: AI 호출 비용/레이턴시, 이미지 lazy loading, Cloudflare Edge 캐시

**STOP.** 이슈당 하나의 AskUserQuestion.

## CRITICAL RULE — How to ask questions

모든 AskUserQuestion은: (1) 2-3개 구체적 알파벳 옵션, (2) 추천 옵션 **첫 번째**, (3) 1-2문장 WHY — 위 Engineering Preferences에 매핑. 배치 금지. Yes/No 금지.

**Format:** "We recommend [LETTER]: [한 줄 이유]" 후 `A) ... B) ... C) ...` 나열. 이슈 NUMBER + 옵션 LETTER (예: "3A", "3B").

**Escape hatch:** 섹션에 이슈 없으면 그렇게 말하고 진행. 명확한 수정이 있고 대안이 없으면 할 것을 말하고 진행 — 질문 낭비하지 않음. 진정한 트레이드오프가 있을 때만 AskUserQuestion.

**Exception:** SMALL CHANGE 모드는 마지막에 배치 AskUserQuestion 1회 — 하지만 각 이슈에 추천 + WHY + 옵션 필요.

## Required Outputs

### "NOT in scope" section
이번에 안 하는 것 + 이유

### "이미 존재하는 것" section
기존 코드 재사용 vs 불필요한 재구축

### Test Diagram
모든 새 경로의 테스트 상태 다이어그램

### Data Flow Diagram
ASCII art. Shadow paths 포함.

### Failure Modes
각 새 코드 경로의 현실적 실패 방법:
1. 테스트가 그 실패를 커버하는가?
2. 에러 핸들링이 있는가?
3. 사용자가 명확한 에러를 보는가, 아니면 조용한 실패인가?

테스트 없음 + 에러 핸들링 없음 + 조용한 실패 = **critical gap**.

### Completion Summary
```
- Step 0: Scope Challenge (user chose: ___)
- Architecture Review: ___ issues
- Code Quality Review: ___ issues
- Test Review: diagram produced, ___ gaps
- Performance Review: ___ issues
- NOT in scope: written
- What already exists: written
- Failure modes: ___ critical gaps
- Unresolved decisions: ___
```

## Retrospective Learning
이 브랜치 git log 확인. 이전 리뷰 사이클(리뷰 기반 리팩터, 되돌린 변경)이 있으면 메모. 이전 문제 영역은 더 공격적으로 리뷰.

## Unresolved Decisions
AskUserQuestion에 응답이 없거나 중단하면, 미해결 결정 기록. "나중에 물 수 있는 미해결 결정들" — 은밀히 기본값으로 결정하지 않음.

## mamastale 민감 영역 체크

변경 대상이 CLAUDE.md의 🔴 민감 영역에 해당하면:
- **즉시 경고** + plan.md 선행 요구
- 위기감지, 결제, 인증, 티켓 시스템
