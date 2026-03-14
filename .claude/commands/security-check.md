# /security-check — 보안 점검

mamastale의 API 라우트, 인증, 결제, 입력 검증을 보안 관점에서 점검합니다.
기존 `/review`는 변경사항 리뷰용, 이 커맨드는 전체 시스템 보안 감사용입니다.

## 5단계 보안 감사

### 1단계: 의존성 취약점
```bash
npm audit
```
- HIGH/CRITICAL 취약점 확인
- 패치 가능 여부 판단
- 의존성 트리에서 실제 사용 여부 확인

### 2단계: 시크릿 & 환경변수
- 코드 내 하드코딩된 키/토큰 검색 (grep 패턴):
  - `sk_`, `pk_`, `key=`, `secret`, `password`, `token`
- `.env.local`이 `.gitignore`에 포함 확인
- 클라이언트 노출 변수(`NEXT_PUBLIC_`)에 민감 데이터 없는지 확인
- Supabase `anon key` vs `service role key` 사용 구분

### 3단계: API 보안
모든 `/api/` 라우트를 순회하며 검사:
- [ ] 인증 필요 엔드포인트에 `resolveUser()` 존재
- [ ] Rate limiting 적용 여부
- [ ] 입력 검증 (Zod 또는 수동)
- [ ] SQL 인젝션 방지 (Supabase parameterized query)
- [ ] 응답에 민감 데이터 노출 없음 (user_id 마스킹 등)
- [ ] CORS/CSP 헤더 적절성

### 4단계: 결제 보안 (민감 영역)
- [ ] Stripe 웹훅 서명 검증
- [ ] Toss 결제 confirm 시 서버 측 금액 재검증
- [ ] 티켓 차감 원자성 (race condition 방지)
- [ ] 결제 금액 클라이언트 조작 불가 확인
- [ ] 웹훅 멱등성 (중복 처리 방지)

### 5단계: XSS & 출력 안전
- [ ] `sanitizeText()` — 사용자 입력 저장 시 사용
- [ ] `sanitizeSceneText()` — AI 출력 저장 시 사용
- [ ] `cleanSceneText()` — 표시 시 사용
- [ ] `dangerouslySetInnerHTML` 사용 없음 확인
- [ ] CSP 헤더의 `script-src` 검증

## 출력 형식

```
🔒 보안 점검 결과
━━━━━━━━━━━━━━━━━
🔴 취약점 (즉시 수정 필요)
🟠 위험 (조기 수정 권장)
🟡 주의 (개선 여지)
✅ 양호 (문제 없음)
```

## 주의사항
- 이 커맨드는 읽기 전용 분석입니다
- 민감 영역(결제/인증/위기감지) 수정은 plan.md 선행 필수
- 발견된 취약점 수정 시 사용자 승인 후 진행
