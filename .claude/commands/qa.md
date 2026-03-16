# /qa — 체계적 QA 테스트

> gstack 패턴 적용: 4가지 모드로 체계적으로 품질을 검증합니다.

You are a QA engineer. Test the web application like a real user — click everything, fill every form, check every state. Produce a structured report with evidence.

## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------|
| Target URL | `http://localhost:3000` | `https://mamastale.com` |
| Mode | diff-aware | `/qa full`, `/qa quick`, `/qa regression` |
| Scope | diff-scoped 또는 전체 | `결제 페이지만 집중` |

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode**.

**preview MCP 서버 확인:**
```bash
# dev 서버 실행 여부 확인
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "READY" || echo "NEEDS_START"
```

서버가 없으면: `npm run dev` 시작 후 preview MCP 사용.

---

## Modes

### Diff-aware (기본 — feature branch에서 URL 없이 실행 시)

개발자가 자기 작업을 검증하는 **기본 모드**. `/qa`만 입력하면 자동 실행.

1. **브랜치 diff 분석**:
   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **영향받는 페이지/라우트 식별**:
   - API route 파일 → 어떤 URL 경로를 서빙하는가
   - Component 파일 → 어떤 페이지에서 렌더링되는가
   - Hook/store 파일 → 어떤 페이지가 이 훅을 사용하는가 (controller 확인)
   - CSS/style 파일 → 어떤 페이지에 해당 스타일이 적용되는가
   - API 엔드포인트 → preview_eval로 직접 fetch 테스트

3. **로컬 앱 감지**:
   ```bash
   curl -s http://localhost:3000 > /dev/null 2>&1 && echo "Found app on :3000"
   ```
   로컬 앱이 없으면 사용자에게 URL 요청.

4. **영향받는 페이지/라우트별 테스트**:
   - 페이지 접근 → preview_screenshot
   - 콘솔 에러 확인
   - 변경이 인터랙티브(폼, 버튼, 플로우)면 end-to-end 테스트
   - preview_snapshot으로 액션 전후 변화 확인

5. **커밋 메시지와 교차 검증** — 변경의 *의도* 이해: 실제로 그 의도가 구현되었는가?

6. **스코프된 리포트**:
   - "테스트한 변경: 이 브랜치에서 영향받는 N개 페이지/라우트"
   - 각 항목: 동작 여부 + 스크린샷 증거
   - 인접 페이지 회귀 없는지 확인

### Full (`/qa full`)
전체 앱 체계적 탐색. 5~10개 잘 증거된 이슈 문서화. Health Score 산출. 앱 크기에 따라 5~15분.

### Quick (`/qa quick`)
30초 스모크 테스트. 홈페이지 + 상위 5개 네비게이션 대상 방문. 페이지 로드, 콘솔 에러, 깨진 링크 확인. Health Score 산출.

### Regression (`/qa regression`)
full 모드 실행 후 과거 버그 재발 여부 집중 확인. 이전 리포트가 있으면 비교.

---

## Workflow

### Phase 1: 초기화

1. dev 서버 확인 (preview MCP 사용)
2. 타이머 시작

### Phase 2: 인증 (필요 시)

- 게스트 모드: 인증 없이 진행 (5턴 제한)
- 로그인 필요 시: preview MCP로 로그인 페이지 접근

### Phase 3: 전체 구조 파악

```
preview_snapshot → 네비게이션 구조 파악
preview_console_logs(level: error) → 랜딩 에러 확인
```

**프레임워크 감지** (Next.js 확인):
- `__next` in HTML → Next.js ✓
- hydration 에러 확인 (`Hydration failed`, `Text content did not match`)
- `_next/data` 요청 404 → 데이터 페칭 깨짐
- 클라이언트 사이드 네비게이션 테스트 (링크 클릭, goto 아님)
- CLS(Cumulative Layout Shift) 확인

### Phase 4: 체계적 탐색

페이지별 방문:

| 페이지 | 확인 사항 |
|--------|----------|
| `/` (랜딩) | CTA 버튼, 동화 갤러리 스와이프, 후기, 추천코드 |
| `/pricing` | 상품 2종, 가격 정확성, 결제 버튼, 소셜 프루프 |
| `/community` | 동화 목록, 무한 스크롤, 좋아요/댓글 |
| `/login` | 카카오/구글 소셜 로그인 버튼 |
| `/library` | (로그인 필요) 내 동화 목록 |
| `/settings` | (로그인 필요) 프로필, 추천코드, 삭제 |

각 페이지에서 **탐색 체크리스트**:
1. **비주얼 스캔** — 스크린샷으로 레이아웃 이슈 확인
2. **인터랙티브 요소** — 버튼, 링크, 컨트롤 모두 클릭
3. **폼** — 빈 값, 잘못된 값, 경계값 테스트
4. **네비게이션** — 모든 진입/이탈 경로
5. **상태** — 빈 상태, 로딩, 에러, 오버플로우
6. **콘솔** — 인터랙션 후 새 JS 에러 확인
7. **반응형** — 모바일 뷰포트 확인:
   ```
   preview_resize(preset: "mobile")
   preview_screenshot
   preview_resize(preset: "desktop")
   ```

**깊이 판단:** 핵심 기능(홈, 대화, 결제, 커뮤니티)에 더 많은 시간, 부차적 페이지(약관, 개인정보)에는 적게.

### Phase 5: 핵심 플로우 테스트

1. **동화 생성 플로우**: 랜딩 → 온보딩 → 대화 → 동화 완성 (게스트 3턴)
2. **결제 플로우**: /pricing → 상품 선택 → 결제창 호출 (실결제 X)
3. **추천 코드 플로우**: ref 파라미터 → 가입 → 자동 claim

### Phase 6: 문서화

이슈 발견 즉시 문서화 — 배치하지 않음.

**인터랙티브 버그** (깨진 플로우, 죽은 버튼, 폼 실패):
1. 액션 전 스크린샷
2. 액션 수행
3. 결과 스크린샷
4. snapshot으로 변경사항 확인
5. 재현 단계 작성

**정적 버그** (오타, 레이아웃 이슈, 누락 이미지):
1. 스크린샷 하나로 문제 표시
2. 무엇이 잘못인지 설명

### Phase 7: 마무리

1. Health Score 계산
2. "Top 3 수정 항목" 작성
3. 콘솔 에러 요약
4. 회귀 테스트 결과 (과거 버그 재발):
   - [ ] 이중 엔티티 인코딩 (`&amp;amp;`) 없는지
   - [ ] 티켓 우회 (`/?action=start` 시 티켓 체크)
   - [ ] 동화 파싱 3가지 전략 모두 동작

---

## Health Score Rubric

카테고리별 점수 (0-100) 산출 후 가중 평균.

### Console (15%)
- 0 에러 → 100
- 1-3 에러 → 70
- 4-10 에러 → 40
- 10+ 에러 → 10

### Links (10%)
- 0 깨진 링크 → 100
- 깨진 링크당 → -15 (최소 0)

### Per-Category (Visual, Functional, UX, Content, Performance, Accessibility)
카테고리별 100점 시작, 발견 이슈당 감점:
- Critical → -25
- High → -15
- Medium → -8
- Low → -3

### Weights
| Category | Weight |
|----------|--------|
| Console | 15% |
| Links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

### Final Score
`score = Σ (category_score × weight)`

---

## 출력 형식

```
🧪 QA 결과 — [모드명]
━━━━━━━━━━━━━━━━━
🏥 Health Score: XX/100

✅ 통과: X항목
🔴 실패: X항목
🟡 경고: X항목

Top 3 수정 항목:
1. [가장 높은 심각도 이슈]
2.
3.

[각 이슈의 상세 내용 + 스크린샷]
```

---

## 중요 규칙

1. **재현이 전부.** 모든 이슈에 최소 1개 스크린샷. 예외 없음.
2. **문서화 전 검증.** 재현 가능한지 한 번 더 확인.
3. **점진적 작성.** 이슈 발견 즉시 리포트에 추가. 배치 금지.
4. **소스 코드 읽지 않음.** 사용자처럼 테스트.
5. **모든 인터랙션 후 콘솔 확인.** 시각적으로 안 보이는 JS 에러도 버그.
6. **사용자처럼 테스트.** 현실적 데이터, 완전한 워크플로우 end-to-end.
7. **깊이 > 넓이.** 5-10개 잘 증거된 이슈 > 20개 모호한 설명.
8. **QA는 읽기 전용** — 코드를 수정하지 않음.
9. **실결제 테스트 금지** — 결제창 호출까지만.
10. **문제 발견 시 수정은 사용자 승인 후** 별도 진행.
