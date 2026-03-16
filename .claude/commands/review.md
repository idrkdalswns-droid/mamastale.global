# /review — Pre-Landing 코드 리뷰

> gstack 패턴 적용: "CI를 통과하지만 프로덕션에서 터지는 버그를 찾아라"

현재 브랜치의 diff를 main 대비 분석하여 구조적 이슈를 찾습니다.

---

## Step 1: 브랜치 확인

1. `git branch --show-current`로 현재 브랜치 확인.
2. `main`에 있으면: **"리뷰할 것이 없습니다 — main 브랜치입니다."** 출력 후 중단.
3. `git fetch origin main --quiet && git diff origin/main --stat` 실행. diff 없으면 같은 메시지 출력 후 중단.

---

## Step 2: 체크리스트 읽기

`.claude/commands/checklist.md` 읽기.

**파일을 읽을 수 없으면 STOP.** 체크리스트 없이 진행하지 않음.

---

## Step 3: diff 가져오기

최신 main을 가져와서 stale main으로 인한 false positive 방지:

```bash
git fetch origin main --quiet
```

`git diff origin/main` 실행. 커밋된 변경과 미커밋 변경 모두 포함.

---

## Step 4: Two-pass 리뷰

체크리스트를 diff에 적용 (2패스):

1. **Pass 1 (CRITICAL):** 결제 안전, 인증/권한, SQL/데이터, XSS/출력, 위기감지, 시크릿
2. **Pass 2 (INFORMATIONAL):** Edge Runtime, 에러 처리, Rate Limiting, 타입 안전, 성능, 코드 품질, UI/스타일, 테스트, 접근성

체크리스트의 출력 형식을 따름. Suppressions 섹션 준수 — "DO NOT flag" 항목은 플래깅 금지.

---

## Step 5: 결과 출력

**항상 모든 발견사항 출력** — CRITICAL과 INFORMATIONAL 모두.

```
🔍 Pre-Landing Review: N issues (X critical, Y informational)

**CRITICAL** (배포 차단):
- [file:line] 문제 설명
  Fix: 수정 제안

**Issues** (비차단):
- [file:line] 문제 설명
  Fix: 수정 제안
```

이슈 없으면: `Pre-Landing Review: No issues found.`

- **CRITICAL 발견 시:** 각 CRITICAL 이슈에 대해 개별 AskUserQuestion:
  - 문제 (`file:line` + 설명)
  - 추천 수정안
  - 선택지: A) 지금 수정 (추천), B) 인지하고 진행, C) False positive — 스킵
  모든 질문 답변 후, A(수정) 선택한 이슈가 있으면 수정 적용.

- **비 CRITICAL만 있으면:** 출력 후 완료. 추가 액션 불필요.

- **이슈 없으면:** `Pre-Landing Review: No issues found.` 출력.

---

## 특별 규칙

- **전체 diff를 읽고 나서 코멘트.** diff에서 이미 해결된 이슈는 플래깅하지 않음.
- **기본적으로 읽기 전용.** 사용자가 "지금 수정"을 선택한 경우에만 파일 수정. 커밋, 푸시, PR 생성 금지.
- **간결하게.** 한 줄 문제, 한 줄 수정. 서두 없음.
- **실제 문제만 플래깅.** 괜찮은 것은 스킵.
- 민감 영역(결제/인증/위기감지) 변경 시: "⚠️ plan.md 선행 필수 영역입니다" 경고
- 500줄 이상 변경 시: "⚠️ 변경 규모가 큽니다. 서브태스크 분할을 고려하세요" 경고
- 새 API 라우트 추가 시: Edge Runtime + Rate Limiting + 인증 3종 세트 확인
- `.env` 관련 변경 시: git stage 여부 반드시 확인
