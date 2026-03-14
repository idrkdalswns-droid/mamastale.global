# /deploy — 8단계 자동 배포 파이프라인

> gstack /ship 패턴 적용: merge → test → review → version → changelog → commit → push

## 중단 조건 (이 중 하나라도 실패하면 배포 중단)

- 빌드 실패
- 테스트 실패
- CRITICAL 리뷰 이슈 발견
- `.env` 파일이 stage에 포함
- 커밋할 변경사항 없음

## 8단계 파이프라인

### Step 1: 사전 검증
```bash
git status                    # 변경사항 확인
git diff --name-only          # 변경 파일 목록
```
- 변경사항이 없으면 → "배포할 변경사항이 없습니다" 보고 후 중단
- `.env` 파일이 staged 되어 있으면 → 즉시 중단 + 경고

### Step 2: 빌드 검증
```bash
npm run build
```
- 실패 시 → 에러 내용 보고, 배포 중단

### Step 3: 테스트 검증
```bash
npm test
```
- 실패 시 → 실패 테스트 목록 보고, 배포 중단

### Step 4: 빠른 코드 리뷰 (CRITICAL만)
변경된 파일을 대상으로 `checklist.md`의 CRITICAL 항목만 빠르게 확인:
- 결제 로직 변경 → 원자성 확인
- 인증 로직 변경 → resolveUser 패턴 확인
- 민감 영역 변경 → plan.md 선행 여부 확인
- 하드코딩된 시크릿 → 즉시 중단

CRITICAL 발견 시 → 보고 후 배포 중단

### Step 5: 버전 범프 (선택)
`package.json`의 버전을 변경 규모에 따라 업데이트:
- **patch** (0.0.x): 버그 수정, 스타일 조정
- **minor** (0.x.0): 새 기능, 새 페이지, 새 API
- **major** (x.0.0): 사용자 승인 필요 (큰 변경)

> 단순 수정(오타, 설정 변경)은 버전 범프 생략

### Step 6: CHANGELOG 업데이트 (선택)
minor 이상 변경 시 `CHANGELOG.md` 맨 위에 추가:
```markdown
## [x.x.x] - YYYY-MM-DD
### Added/Changed/Fixed
- 변경 내용 요약
```
> CHANGELOG.md가 없으면 생성

### Step 7: 커밋
변경사항을 논리적 단위로 분리하여 bisectable 커밋 생성:
1. 인프라/설정 변경 → 첫 번째 커밋
2. 비즈니스 로직 → 두 번째 커밋
3. UI/스타일 → 세 번째 커밋
4. 버전/CHANGELOG → 마지막 커밋

> 작은 변경이면 하나로 합쳐도 됩니다.

커밋 메시지 형식:
```
<type>: <한국어 설명>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
type: feat, fix, refactor, style, docs, chore, perf, test

### Step 8: 푸시 & 배포
```bash
git push origin main
```
- Cloudflare Pages가 자동 빌드/배포 시작
- 최종 결과 보고

## 출력 형식

```
🚀 배포 파이프라인
━━━━━━━━━━━━━━━━━
Step 1 사전 검증  ✅ 변경 파일 X개
Step 2 빌드      ✅ 성공
Step 3 테스트    ✅ XX/XX 통과
Step 4 리뷰      ✅ CRITICAL 0건
Step 5 버전      ✅ x.x.x → x.x.x (또는 ⏭️ 생략)
Step 6 CHANGELOG ✅ 업데이트됨 (또는 ⏭️ 생략)
Step 7 커밋      ✅ X개 커밋
Step 8 푸시      ✅ Cloudflare Pages 배포 시작

📦 배포 완료!
```

## 주의사항

- main 브랜치 직접 push입니다 (PR 워크플로우 아님)
- 빌드/테스트 실패 시 **절대** push하지 않습니다
- `.env` 파일은 **절대** 커밋하지 않습니다
- 민감 영역 변경이 포함된 경우 사용자 확인을 요청합니다
