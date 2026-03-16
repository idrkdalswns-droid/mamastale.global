# /ship — 완전 자동 Ship Workflow

> gstack `/ship` 패턴 적용: merge → test → review → version → changelog → commit → push

**비인터랙티브, 완전 자동** 워크플로우. 확인 요청 금지. `/ship`은 "해라"를 의미. 실행 후 최종 결과만 출력.

**멈추는 경우:**
- `main` 브랜치에 있음 (중단)
- 머지 충돌 해결 불가 (중단, 충돌 표시)
- 테스트 실패 (중단, 실패 표시)
- Pre-landing review에서 CRITICAL 발견 시 사용자가 수정 선택
- MINOR/MAJOR 버전 범프 필요 (물어봄)

**절대 멈추지 않는 경우:**
- 미커밋 변경 (항상 포함)
- 버전 범프 선택 (PATCH 자동 결정)
- CHANGELOG 내용 (diff에서 자동 생성)
- 커밋 메시지 승인 (자동 커밋)

---

## Step 1: Pre-flight

```bash
# 1. 브랜치 확인
git branch --show-current
# main이면 중단: "main에 있습니다. feature 브랜치에서 ship하세요."

# 2. 상태 확인
git status

# 3. 변경 범위 이해
git diff main...HEAD --stat
git log main..HEAD --oneline
```

---

## Step 2: Merge origin/main (테스트 전)

```bash
git fetch origin main && git merge origin/main --no-edit
```

충돌 시: CHANGELOG/package.json 같은 단순 충돌 → 자동 해결. 복잡한 충돌 → **STOP**.

---

## Step 3: 테스트 실행

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm run build 2>&1 | tee /tmp/ship_build.txt
npm test 2>&1 | tee /tmp/ship_tests.txt
```

**빌드 또는 테스트 실패 시:** 실패 내용 표시 후 **STOP**.
**모두 통과 시:** 간단히 수치만 메모하고 계속.

---

## Step 3.5: Pre-Landing Review

1. `.claude/commands/checklist.md` 읽기. 읽을 수 없으면 **STOP**.

2. `git diff origin/main` 실행.

3. 체크리스트를 2패스로 적용:
   - **Pass 1 (CRITICAL):** 결제, 인증, SQL, XSS, 위기감지, 시크릿, Race Conditions
   - **Pass 2 (INFORMATIONAL):** 나머지

4. **항상 모든 발견사항 출력.**

5. `Pre-Landing Review: N issues (X critical, Y informational)`

6. **CRITICAL 발견 시:** 각 이슈에 AskUserQuestion:
   - 문제 + 추천 수정
   - A) 지금 수정 (추천), B) 인지하고 ship, C) False positive
   - A 선택 시: 수정 적용 → 수정 파일만 커밋 → **STOP** — `/ship` 다시 실행하여 재테스트
   - B/C만 선택 시: Step 4로 계속

7. **비 CRITICAL만:** 출력 후 계속. PR body에 포함.
8. **이슈 없으면:** `Pre-Landing Review: No issues found.` 후 계속.

---

## Step 4: Version bump

1. `package.json`의 현재 버전 읽기

2. **diff 기반 자동 결정:**
   - `git diff origin/main...HEAD --stat | tail -1`
   - **PATCH** (0.0.x): < 50줄 변경, 버그 수정, 설정
   - **MINOR** (0.x.0): 50+ 줄, 새 기능, 새 페이지
   - **MINOR/MAJOR**: **사용자에게 물어봄** — 큰 기능 또는 아키텍처 변경

3. `package.json` version 업데이트

---

## Step 5: CHANGELOG

1. `CHANGELOG.md` 헤더 읽기

2. **브랜치의 모든 커밋에서 자동 생성:**
   - `git log main..HEAD --oneline`
   - `git diff main...HEAD`
   - 카테고리별 분류: `### Added`, `### Changed`, `### Fixed`, `### Removed`
   - 간결하고 설명적인 bullet points
   - 날짜: 오늘, 형식: `## [x.y.z] - YYYY-MM-DD`

---

## Step 6: Commit (bisectable chunks)

**목표:** `git bisect`에 유효한 작고 논리적 커밋.

1. 변경사항을 논리적 커밋으로 그룹화. 각 커밋 = **하나의 논리적 변경**.

2. **커밋 순서** (먼저가 위):
   - Infrastructure: config, route 추가
   - Services & hooks: 새 hook, store, util (테스트 포함)
   - Components & pages: 컴포넌트, 페이지 (테스트 포함)
   - VERSION + CHANGELOG: 마지막 커밋

3. **각 커밋은 독립적으로 유효해야 함** — 깨진 import 없음.

4. 커밋 메시지 형식:
   ```
   <type>: <한국어 또는 영어 설명>
   ```
   type: feat/fix/chore/refactor/docs/style/perf/test

5. **마지막 커밋**만 co-author:
   ```bash
   git commit -m "$(cat <<'EOF'
   chore: bump version and changelog (vX.Y.Z)

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

6. 총 diff가 작으면 (< 50줄, < 4파일) 단일 커밋도 OK.

---

## Step 7: Push

```bash
git push origin main
```

Cloudflare Pages가 자동 빌드/배포.

---

## Step 8: 최종 출력

```
🚀 Ship 완료
━━━━━━━━━━━━━━━━━
✅ Build: 성공 (XX pages)
✅ Tests: XX/XX 통과
✅ Review: N issues (X critical, Y informational)
✅ Version: X.Y.Z → X.Y.Z
✅ Commits: N개
✅ Push: Cloudflare Pages 배포 시작

📦 v{version} shipped!
```

---

## Important Rules

- **테스트 스킵 금지.** 실패하면 멈춤.
- **Pre-landing review 스킵 금지.** checklist.md 읽을 수 없으면 멈춤.
- **Force push 금지.** 일반 `git push`만.
- **확인 요청 금지** — MINOR/MAJOR 버전 범프와 CRITICAL 리뷰 발견 시만 예외.
- **.env 파일 절대 커밋 금지.**
- **bisectable 커밋** — 각 커밋 = 하나의 논리적 변경.
- **목표: 사용자가 `/ship` 입력 → 다음에 보는 건 리뷰 결과 + 배포 완료.**
