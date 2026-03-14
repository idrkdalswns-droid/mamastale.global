# /review — 편집광 2-Pass 코드 리뷰

> gstack 패턴 적용: "CI를 통과하지만 프로덕션에서 터지는 버그를 찾아라"

현재 변경사항에 대해 **2-Pass 리뷰**를 수행합니다.
Pass 1에서 CRITICAL만 잡고, Pass 2에서 나머지를 봅니다.

## 사전 준비

1. `git diff --staged` 또는 `git diff`로 변경 범위 확인
2. 변경된 파일 전체 읽기 (diff 컨텍스트만으로는 부족)
3. `.claude/commands/checklist.md` 읽기 (체크리스트 참조)

## Pass 1: CRITICAL (중단 조건)

> 이 패스에서 하나라도 걸리면 **즉시 보고하고 수정을 요구**합니다.

checklist.md의 `CRITICAL` 섹션 기준:
- 결제 안전 (금전 직결)
- 인증/권한 (데이터 유출)
- SQL/데이터 (인젝션)
- XSS/출력 안전
- 위기감지 (생명 직결)
- 시크릿/환경변수

**발견 시 출력 형식:**
```
🔴 CRITICAL — [카테고리]
파일: src/app/api/xxx/route.ts:42
문제: [구체적 설명]
영향: [최악의 시나리오]
수정: [코드 수준 제안]
```

CRITICAL이 0개일 때만 Pass 2로 진행합니다.

## Pass 2: IMPORTANT + INFORMATIONAL

checklist.md의 나머지 섹션 기준으로 검토:

**IMPORTANT (🟠):**
- Edge Runtime 호환
- 에러 처리
- Rate Limiting
- 타입 안전
- 성능

**INFORMATIONAL (🟡):**
- 코드 품질
- 스타일/UI
- 테스트
- 접근성

## 출력 형식

```
🔍 코드 리뷰 결과
━━━━━━━━━━━━━━━━━
📁 변경 파일: X개
📊 변경 규모: +XX / -XX 줄

Pass 1 — CRITICAL
🔴 X건 발견 (또는 ✅ 없음)

Pass 2 — IMPORTANT / INFORMATIONAL
🟠 X건
🟡 X건

총평: [한 줄 요약]
```

## 특별 규칙

- 민감 영역(결제/인증/위기감지) 변경 시: "⚠️ plan.md 선행 필수 영역입니다" 경고
- 500줄 이상 변경 시: "⚠️ 변경 규모가 큽니다. 서브태스크 분할을 고려하세요" 경고
- 새 API 라우트 추가 시: Edge Runtime + Rate Limiting + 인증 3종 세트 확인
- `.env` 관련 변경 시: git stage 여부 반드시 확인
