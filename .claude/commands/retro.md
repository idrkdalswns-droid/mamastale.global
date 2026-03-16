# /retro — 주간 엔지니어링 회고

> gstack `/retro` 패턴 적용: 커밋 히스토리, 작업 패턴, 코드 품질 분석 + 영속 히스토리/트렌드 추적

## 사용법

```
/retro          # 기본: 최근 7일
/retro 24h      # 최근 24시간
/retro 14d      # 최근 14일
/retro 30d      # 최근 30일
/retro compare  # 이번 기간 vs 이전 동일 기간 비교
/retro compare 14d  # 명시적 윈도우로 비교
```

인자 검증: 숫자 + `d`/`h`/`w`, `compare`, `compare` + 숫자 + `d`/`h`/`w`가 아니면 사용법 표시 후 중단.

## Instructions

인자를 파싱하여 시간 윈도우 결정. 기본 7일. 모든 시간은 **KST(한국 표준시)**로 보고 (`TZ=Asia/Seoul`).

### Step 1: 원시 데이터 수집

먼저 fetch하고 현재 사용자 식별:
```bash
git fetch origin main --quiet
git config user.name
git config user.email
```

`git config user.name`이 반환하는 이름이 **"you"** — 이 회고를 읽는 사람. 다른 저자는 팀원. "your" commits vs teammate contributions로 내러티브 구성.

아래 git 명령을 **병렬 실행** (독립적):
```bash
# 1. 타임스탬프, 제목, 해시, 저자, 변경 파일수/추가/삭제
git log origin/main --since="<window>" --format="%H|%aN|%ae|%ai|%s" --shortstat

# 2. 커밋별 테스트 vs 전체 LOC (numstat)
git log origin/main --since="<window>" --format="COMMIT:%H|%aN" --numstat

# 3. 커밋 타임스탬프 (세션 감지 + 시간 분포)
TZ=Asia/Seoul git log origin/main --since="<window>" --format="%at|%aN|%ai|%s" | sort -n

# 4. 파일별 변경 빈도 (핫스팟)
git log origin/main --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# 5. 저자별 커밋 수
git shortlog origin/main --since="<window>" -sn --no-merges

# 6. 현재 테스트 상태
npm test 2>&1 | tail -10
```

### Step 2: 메트릭 계산

| 메트릭 | 값 |
|--------|-----|
| Commits to main | N |
| Contributors | N |
| Total insertions | N |
| Total deletions | N |
| Net LOC added | N |
| Test LOC (insertions) | N |
| Test LOC ratio | N% |
| Version range | vX.Y.Z → vX.Y.Z |
| Active days | N |
| Detected sessions | N |
| Avg LOC/session-hour | N |

**Per-author leaderboard:**
```
Contributor         Commits   +/-          Top area
You (name)               32   +2400/-300   src/app/
alice                    12   +800/-150    src/components/
```
현재 사용자 항상 첫 번째, "You (name)" 라벨.

### Step 3: 커밋 시간 분포

KST 기준 시간별 히스토그램:
```
Hour  Commits  ████████████████
 00:    4      ████
 09:    5      █████
 ...
```
- 피크 시간
- 데드 존
- 이중봉 (아침/저녁) 패턴인지 연속인지
- 심야 코딩 클러스터 (22시 이후)

### Step 4: 작업 세션 감지

**45분 갭** 기준으로 세션 구분. 세션 분류:
- **Deep sessions** (50+ min)
- **Medium sessions** (20-50 min)
- **Micro sessions** (<20 min)

계산:
- 총 활성 코딩 시간 (세션 합산)
- 평균 세션 길이
- 활성 시간당 LOC

### Step 5: 커밋 타입 분석

Conventional commit prefix 기준 (feat/fix/refactor/test/chore/docs/style/perf):
```
feat:     20  (40%)  ████████████████████
fix:      27  (54%)  ███████████████████████████
refactor:  2  ( 4%)  ██
```
fix 비율 50% 초과 시 플래깅 — "ship fast, fix fast" 패턴, 리뷰 갭 가능성.

### Step 6: 핫스팟 분석

변경 빈도 상위 10개 파일:
- 5회 이상 변경 파일 (churn hotspot) 플래깅
- 테스트 vs 프로덕션 파일 비율
- CHANGELOG 빈도 (버전 규율)

### Step 7: PR 크기 분포

- **Small** (<100 LOC)
- **Medium** (100-500 LOC)
- **Large** (500-1500 LOC)
- **XL** (1500+ LOC) — 파일 수와 함께 플래깅

### Step 8: Focus Score + Ship of the Week

**Focus score:** 가장 많이 변경된 최상위 디렉토리의 커밋 비율. 높을수록 집중 작업, 낮을수록 컨텍스트 스위칭.

**Ship of the week:** 윈도우 내 최대 LOC 변경. PR/커밋 번호, 제목, LOC, 왜 중요한지.

### Step 9: 팀원 분석

각 기여자 (현재 사용자 포함):
1. 커밋수, LOC, 삽입/삭제
2. 집중 영역 상위 3개 디렉토리/파일
3. 개인 커밋 타입 분포
4. 세션 패턴 (피크 시간, 세션 수)
5. 테스트 규율 (개인 test LOC 비율)
6. 가장 큰 ship

**현재 사용자 ("You"):** 가장 깊은 분석. "Your peak hours...", "Your biggest ship..."

**팀원:** 2-3문장 + Praise (1-2 구체적) + Growth opportunity (1 구체적).
- Praise는 실제 커밋에 근거. "수고했어요" 아님. 뭐가 좋았는지 정확히.
- Growth는 투자 프레이밍. "X에 시간을 투자하면..."

**솔로 레포면:** 팀 분석 스킵, 개인 회고.

**Co-Authored-By:** AI 공동 저자 (noreply@anthropic.com) → "AI-assisted commits" 별도 메트릭.

### Step 10: 주 단위 트렌드 (14d+ 윈도우)

14일 이상이면 주별 버킷으로 트렌드:
- 주별 커밋, LOC, 테스트 비율, fix 비율, 세션 수

### Step 11: Streak Tracking

```bash
# 팀 streak: 모든 커밋 날짜
TZ=Asia/Seoul git log origin/main --format="%ad" --date=format:"%Y-%m-%d" | sort -u

# 개인 streak: 현재 사용자만
TZ=Asia/Seoul git log origin/main --author="<user_name>" --format="%ad" --date=format:"%Y-%m-%d" | sort -u
```
오늘부터 거꾸로 연속일 카운트.

### Step 12: 히스토리 로드 & 비교

```bash
ls -t .claude/retros/*.json 2>/dev/null
```

이전 회고가 있으면 로드하여 **Trends vs Last Retro** 섹션:
```
                    Last        Now         Delta
Test ratio:         22%    →    41%         ↑19pp
Sessions:           10     →    14          ↑4
Fix ratio:          54%    →    30%         ↓24pp (improving)
```

없으면: "첫 회고 기록 — 다음 주에 다시 실행하면 트렌드를 볼 수 있습니다."

### Step 13: 히스토리 저장

```bash
mkdir -p .claude/retros
```

JSON 스냅샷 저장 (`.claude/retros/YYYY-MM-DD-N.json`):

```json
{
  "date": "2026-03-16",
  "window": "7d",
  "metrics": {
    "commits": 47,
    "contributors": 1,
    "insertions": 3200,
    "deletions": 800,
    "net_loc": 2400,
    "test_loc": 1300,
    "test_ratio": 0.41,
    "active_days": 6,
    "sessions": 14,
    "deep_sessions": 5,
    "avg_session_minutes": 42,
    "loc_per_session_hour": 350,
    "feat_pct": 0.40,
    "fix_pct": 0.30,
    "peak_hour": 22,
    "ai_assisted_commits": 32
  },
  "version_range": ["1.10.0", "1.11.0"],
  "streak_days": 47,
  "tweetable": "Week of Mar 9: 47 commits, 3.2k LOC, 38% tests, peak: 10pm | Streak: 47d"
}
```

### Step 14: 내러티브 작성

---

**Tweetable summary** (첫 줄):
```
Week of Mar 9: 47 commits, 3.2k LOC, 38% tests, peak: 10pm | Streak: 47d
```

## 🔄 Engineering Retro: [date range]

### 📊 Summary Table
(Step 2)

### 📈 Trends vs Last Retro
(Step 12 — 첫 회고면 스킵)

### ⏰ Time & Session Patterns
(Steps 3-4)
패턴 해석: 최생산 시간대, 세션 길이 변화, 하루 활성 시간, 심야 코딩 패턴

### 🚀 Shipping Velocity
(Steps 5-7)
커밋 타입, PR 크기 규율, fix-chain 감지, 버전 범프 규율

### 🔬 Code Quality Signals
- Test LOC 비율 트렌드
- 핫스팟 (같은 파일 churn?)
- XL PR 분할 필요 여부

### 🎯 Focus & Highlights
(Step 8) — Focus score + Ship of the Week

### 👤 Your Week (개인 deep-dive)
(Step 9, 현재 사용자)
- 개인 커밋, LOC, 테스트 비율
- 세션 패턴, 피크 시간
- 집중 영역, 가장 큰 ship
- **이번 주 잘한 것** (2-3 구체적)
- **레벨업 포인트** (1-2 구체적, 실행 가능)

### 👥 Team Breakdown
(Step 9, 팀원별 — 솔로면 스킵)

### 🏆 Top 3 Wins
윈도우 내 가장 임팩트 있는 3개 ship

### 🔧 3 Things to Improve
구체적, 실행 가능, 실제 커밋에 근거

### 💡 3 Habits for Next Week
작고, 실용적, 현실적. 각각 5분 이내 도입 가능.

### 📊 Week-over-Week Trends
(Step 10, 해당 시)

---

## Compare Mode

`/retro compare` 실행 시:
1. 현재 윈도우 메트릭 계산
2. 바로 이전 동일 길이 윈도우 계산 (`--since`와 `--until`으로 겹침 방지)
3. 나란히 비교 테이블 + 델타 + 화살표
4. 가장 큰 개선/악화 하이라이트 내러티브
5. 현재 윈도우 스냅샷만 저장

## 톤

- 격려하되 솔직, 감싸주지 않음
- 구체적, 항상 실제 커밋/코드 인용
- 비판은 투자 프레이밍 ("X에 시간을 투자하면...")
- 칭찬은 실제 성과에 근거 — "수고했어요" 금지, 뭐가 좋았는지 정확히
- 총 출력 3000-4500 단어
- 마크다운 테이블 + 코드 블록으로 데이터, 산문으로 내러티브
- 출력은 대화에 직접 — 파일 쓰기는 `.claude/retros/` JSON만

## Important Rules

- 모든 내러티브는 대화에 직접 출력. 파일은 JSON 스냅샷만
- `origin/main` 사용 (로컬 main 아님)
- 모든 타임스탬프 KST (`TZ=Asia/Seoul`)
- 커밋 0개면 그렇게 말하고 다른 윈도우 제안
- LOC/hour는 50 단위 반올림
- 첫 실행 (이전 회고 없음) 시 비교 섹션 우아하게 스킵
