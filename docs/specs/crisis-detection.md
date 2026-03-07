# Spec: 다층 위기감지 시스템 (CSSRS 기반)

> 🔴 이 스펙의 변경은 임상 전문가 검토 필수
> Red Hat: "스펙이 코드의 Single Source of Truth"

## 버전: 2.0 (2025-03)

## 개요

CSSRS(Columbia Suicide Severity Rating Scale) 기반의 다층 위기감지 시스템.
사용자 메시지에서 위기 신호를 사전 스크리닝하여 3단계로 대응합니다.

## CSSRS 5단계 매핑

| Level | CSSRS 정의 | 예시 패턴 |
|-------|-----------|----------|
| 1 | 죽고 싶은 생각 (Wish to be dead) | "살기 싫다", "없어지고 싶다" |
| 2 | 비특정 자살 사고 (Non-specific suicidal thoughts) | "끝내고 싶다" |
| 3 | 방법 없는 자살 사고 (Ideation without intent) | "자살 생각이 든다" |
| 4 | 의도 있는 자살 사고 (Ideation with intent) | "죽을 방법을 찾고 있다" |
| 5 | 구체적 계획 (Suicidal ideation with plan) | 구체적 방법 + 시기 언급 |

## 3단계 대응 체계

### HIGH (CSSRS Level 4-5)
- **동작**: Claude API 호출 바이패스
- **응답**: 하드코딩된 위기 개입 메시지 (전화번호 포함)
- **로깅**: crisis_events 테이블 + event_logs 즉시 기록
- **긴급 연락처**: 1393 (자살예방), 1577-0199 (정신건강), 119

### MEDIUM (CSSRS Level 2-3)
- **동작**: `<crisis_context>` 프롬프트 주입 후 Claude 호출
- **응답**: Claude가 위기 맥락을 인지한 상태로 공감적 응답
- **로깅**: event_logs 기록

### LOW (CSSRS Level 1)
- **동작**: 정상 Claude 호출
- **응답**: 일반 대화 진행
- **로깅**: event_logs에 LOW 기록

## False Positive 방지

14개 패턴으로 오탐 방지:
- 동화 맥락 ("캐릭터가 죽었다")
- 관용적 표현 ("죽을 만큼 맛있다")
- 과거 경험 서술 ("예전에 그런 생각을 했었다")
- 명시적 부정 ("자살 생각은 없다")

## 관련 파일

- `src/lib/anthropic/system-prompt.ts` — screenForCrisis() 함수
- `src/app/api/chat/route.ts` — 위기감지 호출 지점
- `supabase/migrations/017_crisis_tracking.sql` — DB 스키마

## 변경 프로토콜

1. 이 스펙 문서를 먼저 수정
2. plan.md 작성 → 임상 전문가 검토
3. 구현 후 회귀 테스트 (`/crisis-test` 스킬)
4. 스테이징 환경에서 수동 검증
5. 프로덕션 배포

## 변경 이력

| 날짜 | 변경 | 검토자 |
|------|------|--------|
| 2025-03 | 초기 CSSRS 기반 구현 | - |
| 2025-03 | False positive 패턴 14개 추가 | - |
| 2025-03 | crisis_events DB 테이블 추가 | - |
