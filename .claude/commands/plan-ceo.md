# /plan-ceo — 파운더 모드 플랜 리뷰

> gstack `/plan-ceo-review` 패턴 적용: 10-star product을 찾아내는 창업자 관점 리뷰

## 핵심 철학

- "Zero silent failures" — 모든 실패는 사용자에게 보여야 한다
- "Every error has a name" — 제네릭 에러 금지
- "10x better" — 현재 요구사항의 10배 좋은 버전을 상상한다
- mamastale은 치유적 내러티브 서비스 — 감정적 안전이 최우선

## 3가지 모드

시작 시 사용자에게 모드 선택을 요청합니다:

### MODE A: SCOPE EXPANSION (스코프 확장)
- 꿈을 크게. "이게 10x 더 좋으면 어떤 모습?"
- 새 기능, 새 경험, 새 가치를 탐색
- 기술 부채를 감수하더라도 비전 우선

### MODE B: HOLD SCOPE (스코프 유지)
- 현재 스코프를 고정하고 최대한 견고하게
- 모든 실패 모드 식별, 에러 핸들링 완벽화
- 보안, 성능, 접근성 빈틈 찾기

### MODE C: SCOPE REDUCTION (스코프 축소)
- 최소 핵심만 남기기. "이것 없으면 서비스가 안 돌아가나?"
- 복잡성 제거, 기존 코드 재활용 극대화
- 빠르게 출시하고 피드백 받기

## 사전 조사 (자동 실행)

```bash
git log --oneline -20
git diff --stat
git stash list
```
- `grep -r "TODO\|FIXME\|HACK"` 로 미해결 이슈 파악
- CLAUDE.md의 민감 영역 확인

## Step 0: 전제 도전 (Nuclear Scope Challenge)

리뷰 시작 전 반드시 질문:

### 0A. 전제 도전
- "이 기능이 정말 필요한가? 다른 방법은?"
- "이걸 안 만들면 어떤 일이 벌어지나?"

### 0B. 기존 코드 활용
- 이미 존재하는 코드로 해결 가능한 부분 식별
- "새로 만드는 것 vs 기존 확장" 비교

### 0C. 꿈의 상태 (Dream State)
- MODE A: "10-star 버전은 어떤 모습인가?"
- MODE B: "완벽하게 동작하는 모습은?"
- MODE C: "MVP 중의 MVP는?"

### 0D. 모드별 분석 실행
- MODE A → 3개 이상의 확장 아이디어 제시
- MODE B → 모든 에지 케이스와 실패 시나리오 나열
- MODE C → "필수 vs 선택" 분류표

## 10-섹션 리뷰

각 섹션에서 이슈 발견 시 → **하나의 이슈당 하나의 AskUserQuestion**

### 1. 아키텍처
- 의존성 그래프, 데이터 흐름, 상태 머신, 보안 경계
- mamastale 특화: 4단계 대화 엔진, 10장면 파싱, Zustand 스토어

### 2. 에러 & 복구 맵
- 무엇이 실패할 수 있나? 어떻게 잡히나? 사용자에게 뭐가 보이나?
- mamastale 특화: AI 응답 파싱 실패, 결제 중단, 티켓 차감 실패

### 3. 보안 & 위협 모델
- 공격 표면, 입력 검증, 인가, 인젝션 리스크
- mamastale 특화: RLS, CSRF, XSS (마크다운→HTML), 위기감지 우회

### 4. 데이터 흐름 & 엣지 케이스
- 더블 클릭, 오래된 상태, 타임아웃, 동시 요청
- mamastale 특화: SSE 스트리밍 중 연결 끊김, 세션 복원

### 5. 코드 품질
- DRY 위반, 네이밍, 과잉/과소 엔지니어링
- mamastale 특화: 인라인 스타일 vs Tailwind 토큰, 한국어 메시지 일관성

### 6. 테스트 리뷰
- 커버리지 다이어그램, 적대적 테스트, 카오스 테스트
- mamastale 특화: story-parser 전략, 위기감지 회귀, 결제 흐름

### 7. 성능
- N+1 쿼리, 인덱스, 캐싱, 풀링
- mamastale 특화: Edge Runtime 제약, AI 호출 레이턴시, 이미지 최적화

### 8. 관측성 & 디버깅
- 로깅, 메트릭, 트레이싱, 알림
- mamastale 특화: LLM 호출 추적, 위기 이벤트 추적, 에러 리포팅

### 9. 배포 & 롤아웃
- 마이그레이션, 피처 플래그, 롤백, 스모크 테스트
- mamastale 특화: Cloudflare Pages 자동 배포, DB 마이그레이션 순서

### 10. 장기 궤적
- 기술 부채, 되돌릴 수 있는가, 지식 집중도
- mamastale 특화: 다국어 확장성, 이미지 생성 통합 준비도

## 질문 규칙 (CRITICAL)

```
하나의 이슈 = 하나의 AskUserQuestion
2~3개의 구체적 선택지 (A, B, C)
추천 옵션을 첫 번째에 + "(추천)" 표시
각 옵션에 한 줄 근거
```

## 필수 출력물

1. **NOT in scope** — 이번에 안 하는 것 + 이유
2. **이미 존재하는 것** — 재사용 vs 새로 만들기 분석
3. **에러 & 복구 레지스트리** — 실패 모드 전체 목록
4. **다이어그램** — ASCII 아트로 데이터 흐름, 상태 머신
5. **TODOS** — 미해결 결정, 후속 작업
6. **완료 요약표** — 10섹션 × Pass/Fail/Skip

## mamastale 민감 영역 체크

리뷰 대상이 아래 영역에 해당하면 **즉시 사용자에게 경고**:
- 위기감지 (`system-prompt.ts`, `output-safety.ts`)
- 결제 (`checkout`, `webhooks/stripe`, `payments/confirm`)
- 인증 (`server-api.ts`, `middleware.ts`)
- 티켓 차감 (`tickets.ts`)
