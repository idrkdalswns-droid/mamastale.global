# Pre-Landing Review Checklist

## Instructions

`git diff origin/main` 출력에서 아래 이슈를 검토합니다. 구체적으로 — `file:line` 인용하고 수정 제안. 괜찮은 것은 스킵. 실제 문제만 플래깅.

**Two-pass review:**
- **Pass 1 (CRITICAL):** 결제, 인증, SQL, XSS, 위기감지, 시크릿, Race Conditions, LLM Trust Boundary를 먼저. 배포를 차단할 수 있음.
- **Pass 2 (INFORMATIONAL):** 나머지 카테고리. PR body에 포함되지만 배포를 차단하지 않음.

**Output format:**

```
Pre-Landing Review: N issues (X critical, Y informational)

**CRITICAL** (blocking deploy):
- [file:line] Problem description
  Fix: suggested fix

**Issues** (non-blocking):
- [file:line] Problem description
  Fix: suggested fix
```

이슈 없으면: `Pre-Landing Review: No issues found.`

간결하게. 이슈당: 한 줄 문제, 한 줄 수정. 서두 없음, 요약 없음, "전체적으로 좋아보임" 없음.

---

## Review Categories

### Pass 1 — CRITICAL

#### 결제 안전
- Stripe/Toss 웹훅 서명 검증이 존재하는가?
- 결제 금액이 서버에서 재검증되는가? (클라이언트 금액 신뢰 금지)
- 티켓 차감이 원자적(atomic)인가? (race condition 없는가?)
- 웹훅 멱등성이 보장되는가? (중복 결제 방지)

#### 인증/권한
- 보호 API에 `resolveUser()` 호출이 있는가?
- RLS가 활성화된 테이블에 service role key 없이 접근하는가?
- Cookie 인증 + Bearer 토큰 fallback 패턴을 따르는가?
- 사용자 A가 사용자 B의 데이터에 접근할 수 없는가?

#### SQL/데이터 안전
- Supabase 쿼리가 parameterized인가? (문자열 연결 없는가?)
- `.single()` 호출 시 결과가 없을 때 에러 처리가 있는가?
- 사용자 입력이 직접 쿼리에 들어가지 않는가?
- TOCTOU races: check-then-set 패턴이 atomic `WHERE` + update로 처리되는가?

#### Race Conditions & Concurrency
- read-check-write 패턴에 uniqueness constraint 또는 retry가 있는가?
- `findOrCreate` 패턴에 unique DB index가 있는가?
- 상태 전이가 atomic `WHERE old_status = ? UPDATE SET new_status`로 처리되는가?

#### XSS/출력 안전
- 사용자 입력 저장 시 `sanitizeText()` 사용하는가?
- AI 생성 텍스트 저장 시 `sanitizeSceneText()` 사용하는가?
- `dangerouslySetInnerHTML` 사용이 없는가?
- 표시 시점에 `cleanSceneText()` 사용하는가?

#### LLM Output Trust Boundary
- LLM 생성 값(이메일, URL, 이름)이 DB 저장 또는 전달 전 포맷 검증되는가?
- 구조화된 tool output(배열, 해시)이 DB 쓰기 전 타입/형태 검증되는가?

#### 위기감지 (민감 영역)
- `system-prompt.ts`의 위기 키워드가 변경되지 않았는가?
- 위기 응답 바이패스 로직이 손상되지 않았는가?

#### 시크릿/환경변수
- 코드에 API 키/토큰이 하드코딩되지 않았는가?
- `NEXT_PUBLIC_` 변수에 민감 데이터가 없는가?
- `.env.local`이 git에 포함되지 않았는가?

### Pass 2 — INFORMATIONAL

#### Edge Runtime 호환
- 새 API 라우트에 `export const runtime = "edge"` 존재하는가?
- Node.js 전용 모듈(fs, path, crypto 등)을 사용하지 않는가?

#### 에러 처리
- API 라우트에서 try/catch가 적절한가?
- `request.json()` 파싱이 try/catch로 감싸져 있는가?
- 에러 응답이 한국어인가?
- Supabase 에러가 사용자에게 노출되지 않는가?

#### Conditional Side Effects
- 조건 분기에서 한쪽만 side effect 적용하고 다른 쪽을 빠뜨린 경우
- 로그 메시지가 실제 발생한 일과 다른 것을 기록하는 경우

#### Rate Limiting
- 공개 API에 rate limiting이 적용되어 있는가?
- AI 호출 엔드포인트에 비용 보호가 있는가?

#### Magic Numbers & String Coupling
- 여러 파일에서 사용되는 bare numeric literal — named constant로 추출
- 에러 메시지 문자열이 다른 곳에서 쿼리 필터로 사용되는 경우

#### 타입 안전
- `any` 타입 사용이 없는가?
- Zod 스키마로 입력이 검증되는가?
- UUID 형식이 검증되는가?

#### Dead Code & Consistency
- 할당되었지만 읽히지 않는 변수
- CHANGELOG 항목이 실제 변경사항과 정확히 일치하는가
- 코드 변경 후 주석/docstring이 이전 동작을 설명하는 경우

#### 성능
- `select('*')` 대신 필요 컬럼만 선택하는가?
- N+1 쿼리 패턴이 없는가?
- 이미지에 `loading="lazy"` 또는 next/image 사용하는가?
- 대량 조회에 `.limit()` 또는 페이지네이션이 있는가?

#### Test Gaps
- negative-path 테스트가 type/status 외 side effect도 검증하는가?
- 보안 기능(blocking, rate limiting, auth)에 integration 테스트가 있는가?

#### Crypto & Entropy
- truncation 대신 hashing 사용하는가?
- 보안 관련 값에 `Math.random()` 대신 `crypto.randomUUID()` 사용하는가?
- secret/token 비교에 constant-time 비교 사용하는가?

#### 코드 품질
- 미사용 import가 없는가?
- `console.log` (error/warn 외)가 없는가?
- 500줄 이상 파일이 아닌가?

#### 스타일/UI
- 한국어 텍스트에 `break-keep`이 적용되어 있는가?
- 다크 모드에서 정상 표시되는가?
- 모바일(430px 이하)에서 레이아웃이 깨지지 않는가?

#### 접근성
- 버튼/링크에 적절한 aria-label이 있는가?
- 터치 영역이 최소 44px인가?
- 색상 대비가 WCAG AA를 만족하는가?

---

## Gate Classification

```
CRITICAL (blocks deploy):            INFORMATIONAL (in PR body):
├─ 결제 안전                          ├─ Edge Runtime 호환
├─ 인증/권한                          ├─ 에러 처리
├─ SQL/데이터 안전                    ├─ Conditional Side Effects
├─ Race Conditions & Concurrency     ├─ Rate Limiting
├─ XSS/출력 안전                     ├─ Magic Numbers & String Coupling
├─ LLM Output Trust Boundary         ├─ 타입 안전
├─ 위기감지                           ├─ Dead Code & Consistency
└─ 시크릿/환경변수                    ├─ 성능
                                      ├─ Test Gaps
                                      ├─ Crypto & Entropy
                                      ├─ 코드 품질
                                      ├─ 스타일/UI
                                      └─ 접근성
```

---

## Suppressions — DO NOT flag these

- "X is redundant with Y" — 해가 없고 가독성에 도움되는 중복
- "Add a comment explaining why this threshold/constant was chosen" — 임계값은 자주 바뀌고, 주석은 부패함
- "This assertion could be tighter" — 이미 동작을 커버하는 경우
- 일관성만을 위한 변경 제안 (다른 패턴과 맞추기 위해 조건문으로 감싸기)
- "Regex doesn't handle edge case X" — 입력이 제약되어 X가 실제로 발생하지 않는 경우
- 해가 없는 no-op
- 리뷰 중인 diff에서 **이미 해결된 것** — 코멘트 전에 전체 diff를 반드시 읽을 것
