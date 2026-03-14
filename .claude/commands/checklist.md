# mamastale 코드 리뷰 체크리스트

> gstack의 편집광 리뷰어 패턴 적용. 이 파일은 `/review`가 참조하는 독립 체크리스트입니다.
> 프로젝트가 발전하면 여기에 항목을 추가/수정하세요.

---

## CRITICAL (즉시 수정 — 프로덕션 사고 직결)

### 결제 안전
- [ ] Stripe/Toss 웹훅 서명 검증이 존재하는가?
- [ ] 결제 금액이 서버에서 재검증되는가? (클라이언트 금액 신뢰 금지)
- [ ] 티켓 차감이 원자적(atomic)인가? (race condition 없는가?)
- [ ] 웹훅 멱등성이 보장되는가? (중복 결제 방지)

### 인증/권한
- [ ] 보호 API에 `resolveUser()` 호출이 있는가?
- [ ] RLS가 활성화된 테이블에 service role key 없이 접근하는가?
- [ ] Cookie 인증 + Bearer 토큰 fallback 패턴을 따르는가?
- [ ] 사용자 A가 사용자 B의 데이터에 접근할 수 없는가?

### SQL/데이터
- [ ] Supabase 쿼리가 parameterized인가? (문자열 연결 없는가?)
- [ ] `.single()` 호출 시 결과가 없을 때 에러 처리가 있는가?
- [ ] 사용자 입력이 직접 쿼리에 들어가지 않는가?

### XSS/출력 안전
- [ ] 사용자 입력 저장 시 `sanitizeText()` 사용하는가?
- [ ] AI 생성 텍스트 저장 시 `sanitizeSceneText()` 사용하는가?
- [ ] `dangerouslySetInnerHTML` 사용이 없는가?
- [ ] 표시 시점에 `cleanSceneText()` 사용하는가?

### 위기감지 (민감 영역)
- [ ] `system-prompt.ts`의 위기 키워드가 변경되지 않았는가?
- [ ] 위기 응답 바이패스 로직이 손상되지 않았는가?

### 시크릿/환경변수
- [ ] 코드에 API 키/토큰이 하드코딩되지 않았는가?
- [ ] `NEXT_PUBLIC_` 변수에 민감 데이터가 없는가?
- [ ] `.env.local`이 git에 포함되지 않았는가?

---

## IMPORTANT (빠른 수정 권장 — 서비스 품질 영향)

### Edge Runtime 호환
- [ ] 새 API 라우트에 `export const runtime = "edge"` 존재하는가?
- [ ] Node.js 전용 모듈(fs, path, crypto 등)을 사용하지 않는가?
- [ ] `"use client"` 페이지가 아닌 layout에서 runtime을 설정하는가?

### 에러 처리
- [ ] API 라우트에서 try/catch가 적절한가?
- [ ] `request.json()` 파싱이 try/catch로 감싸져 있는가?
- [ ] 에러 응답이 한국어인가?
- [ ] Supabase 에러가 사용자에게 노출되지 않는가?

### Rate Limiting
- [ ] 공개 API에 rate limiting이 적용되어 있는가?
- [ ] AI 호출 엔드포인트에 비용 보호가 있는가?

### 타입 안전
- [ ] `any` 타입 사용이 없는가?
- [ ] Zod 스키마로 입력이 검증되는가?
- [ ] UUID 형식이 검증되는가?

### 성능
- [ ] `select('*')` 대신 필요 컬럼만 선택하는가?
- [ ] N+1 쿼리 패턴이 없는가?
- [ ] 이미지에 `loading="lazy"` 또는 next/image 사용하는가?
- [ ] 대량 조회에 `.limit()` 또는 페이지네이션이 있는가?

---

## INFORMATIONAL (개선 여지 — 기술 부채)

### 코드 품질
- [ ] 미사용 import가 없는가?
- [ ] `console.log` (error/warn 외)가 없는가?
- [ ] 500줄 이상 파일이 아닌가?
- [ ] 순환 의존성이 없는가?

### 스타일/UI
- [ ] 한국어 텍스트에 `break-keep`이 적용되어 있는가?
- [ ] 하드코딩된 한국어 문자열이 i18n 키로 대체 가능한가?
- [ ] 다크 모드에서 정상 표시되는가?
- [ ] 모바일(430px 이하)에서 레이아웃이 깨지지 않는가?

### 테스트
- [ ] 새 유틸리티 함수에 테스트가 있는가?
- [ ] 기존 테스트가 깨지지 않았는가?

### 접근성
- [ ] 버튼/링크에 적절한 aria-label이 있는가?
- [ ] 터치 영역이 최소 44px인가?
- [ ] 색상 대비가 WCAG AA를 만족하는가?
