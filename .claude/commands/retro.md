# /retro — 주간 엔지니어링 회고

> gstack `/retro` 패턴 적용: 커밋 히스토리, 작업 패턴, 코드 품질 분석 기반 주간 회고

## 사용법

```
/retro          # 기본: 최근 7일
/retro 24h      # 최근 24시간
/retro 14d      # 최근 14일
/retro 30d      # 최근 30일
/retro compare  # 지난주 vs 이번주 비교
```

## 실행 단계

### Step 1: 원시 데이터 수집

아래 명령어를 **병렬 실행**:

```bash
# 1. 커밋 히스토리 (기간 내)
git log --since="7 days ago" --oneline --format="%h %aI %an %s"

# 2. 변경 통계
git log --since="7 days ago" --stat --format=""

# 3. 파일별 변경 빈도
git log --since="7 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -20

# 4. 추가/삭제 라인 수
git log --since="7 days ago" --numstat --format=""

# 5. 커밋 타입 분류 (conventional commits)
git log --since="7 days ago" --oneline | grep -oE "^[a-f0-9]+ (feat|fix|refactor|style|docs|chore|perf|test):" | awk '{print $2}' | sort | uniq -c | sort -rn

# 6. 현재 브랜치 상태
git status --short

# 7. 최근 태그 (버전)
git tag --sort=-creatordate | head -5

# 8. 테스트 상태
npm test 2>&1 | tail -5
```

### Step 2: 메트릭 계산

| 메트릭 | 계산 방법 |
|--------|----------|
| 총 커밋 수 | `git log --oneline` 카운트 |
| 추가/삭제 라인 | `--numstat` 합산 |
| 테스트 커버리지 비율 | test 커밋 수 / 전체 커밋 수 |
| 핫스팟 파일 | 변경 빈도 상위 10개 |
| 커밋 타입 분포 | feat/fix/refactor/style/docs/chore/perf/test |
| 버전 변화 | 태그 기반 |

### Step 3: 시간 분포

커밋 시간을 KST(한국 표준시) 기준으로 히스토그램 생성:

```
시간대별 커밋 분포 (KST)
00-03 ▓░░░░░░░░░  2
03-06 ░░░░░░░░░░  0
06-09 ░░░░░░░░░░  0
09-12 ▓▓▓▓▓▓░░░░  12
12-15 ▓▓▓▓▓▓▓▓░░  18
15-18 ▓▓▓▓▓▓▓▓▓░  22
18-21 ▓▓▓▓▓░░░░░  10
21-24 ▓▓▓░░░░░░░  6
```

### Step 4: 작업 세션 감지

- **45분 이상 공백** = 세션 구분
- 세션 유형:
  - 🔥 Deep (2시간+): 집중 개발
  - 🌊 Medium (30분~2시간): 일반 작업
  - ⚡ Micro (30분 미만): 빠른 수정

### Step 5: 커밋 타입 분석

```
feat     ▓▓▓▓▓▓▓▓░░  40%  새 기능
fix      ▓▓▓░░░░░░░  15%  버그 수정
refactor ▓▓░░░░░░░░  10%  리팩토링
style    ▓▓▓▓░░░░░░  20%  UI/스타일
docs     ▓░░░░░░░░░   5%  문서
chore    ▓▓░░░░░░░░  10%  설정/빌드
```

### Step 6: 핫스팟 분석

변경 빈도 상위 10개 파일 + 변경 이유 분류

### Step 7: 포커스 점수

```
포커스 점수 = 상위 3개 파일 변경 비율
높음 (70%+): 집중적 작업
중간 (40-70%): 분산 작업
낮음 (40% 미만): 산발적 수정
```

### Step 8: Ship of the Week

가장 임팩트 있는 변경 1개를 선정하고 이유 설명

### Step 9: mamastale 특화 분석

- **치유적 기능 vs 기술 인프라** 비율
- **민감 영역 변경** 있었는가? (위기감지, 결제, 인증)
- **사용자 대면 변경** vs 내부 변경 비율
- **다국어 영향** 있는 변경이 있었는가?

### Step 10: 트렌드 비교

이전 회고 데이터가 있으면 (`CHANGELOG.md` 기반):
- 커밋 볼륨 증감
- feat vs fix 비율 변화
- 핫스팟 파일 변화

### Step 11: 히스토리 저장

회고 결과를 JSON으로 저장:

```bash
mkdir -p .claude/retros
```

파일명: `.claude/retros/retro-YYYY-MM-DD.json`

```json
{
  "date": "2026-03-14",
  "period": "7d",
  "commits": 45,
  "lines_added": 2500,
  "lines_deleted": 800,
  "test_ratio": 0.15,
  "focus_score": 0.72,
  "top_files": ["page.tsx", "PricingContent.tsx"],
  "ship_of_week": "구매 페이지 14-페르소나 QA",
  "commit_types": {"feat": 18, "fix": 7, "refactor": 5}
}
```

## 출력 형식

```markdown
# 🔄 주간 회고 — YYYY.MM.DD ~ YYYY.MM.DD

## 📊 한 줄 요약
> (트윗 가능한 한 줄)

## 📈 메트릭
| 메트릭 | 값 | 트렌드 |
|--------|-----|--------|
| 커밋 | XX | ↑↓→ |
| 추가 라인 | X,XXX | |
| 삭제 라인 | XXX | |
| 테스트 비율 | XX% | |
| 포커스 점수 | X.XX | |

## ⏰ 시간 분포
(히스토그램)

## 🔥 핫스팟
(상위 5개 파일)

## 🏆 Ship of the Week
(가장 임팩트 있는 변경)

## ✅ 이번 주 잘한 것 (3개)
1.
2.
3.

## 🔧 다음 주 개선할 것 (3개)
1.
2.
3.

## 💡 다음 주 습관 (3개)
1.
2.
3.
```

## 톤 가이드

- 격려하되 솔직하게
- 항상 구체적으로 (실제 커밋, 실제 파일 인용)
- 비판은 "투자"로 프레이밍 ("X에 시간을 투자하면...")
- 칭찬은 실제 성과에 근거

## Compare 모드

`/retro compare` 실행 시:
- 이전 회고 JSON 로드
- 동일 메트릭으로 비교 테이블 생성
- 개선/악화 트렌드 하이라이트
