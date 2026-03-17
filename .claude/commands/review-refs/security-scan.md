# 보안 스캔 전략 — mamastale 전용

## 파일 우선순위 (이 순서로 읽는다)

```
1순위 — 즉시 읽기 (공격 표면):
  src/middleware.ts                           # 보호 라우트 범위, 보안 헤더
  src/app/api/*/route.ts                      # 모든 API 엔드포인트
  .env.example                                # 어떤 시크릿이 필요한지 파악

2순위 — 반드시 읽기 (인증·인가):
  src/lib/supabase/server-api.ts              # Service Role Key 사용 패턴
  src/lib/supabase/client.ts                  # 클라이언트 키 노출
  src/lib/supabase/tickets.ts                 # 원자적 티켓 차감

3순위 — 심층 분석 (비즈니스 로직 보안):
  src/lib/anthropic/system-prompt.ts          # 위기감지 키워드 변조 불가 여부
  src/lib/anthropic/teacher-prompts.ts        # 선생님 모드 프롬프트 인젝션
  src/lib/utils/validation.ts                 # 입력 검증 함수
  src/lib/anthropic/output-safety.ts          # 출력 안전성
  src/lib/utils/teacher-sanitize.ts           # 선생님 모드 sanitize

4순위 — 결제·웹훅:
  src/app/api/checkout/route.ts               # 결제 로직, 금액 검증
  src/app/api/webhooks/stripe/route.ts        # 웹훅 서명 검증
```

## 공격 벡터별 스캔 패턴

### 시크릿 노출
```bash
# 1. 하드코딩 시크릿
grep -rn 'sk-ant-\|sk_live_\|sk_test_\|eyJhbGciOi\|sbp_' src/

# 2. 서버 전용 env가 클라이언트에서 접근 가능한 경로
#    NEXT_PUBLIC_ 없는 env를 사용하는 파일이 'use client' 체인에 있는지
grep -rn 'process\.env\.' src/ --include='*.ts' --include='*.tsx' | grep -v NEXT_PUBLIC | grep -v 'route\.ts' | grep -v 'server'

# 3. git 히스토리에 시크릿 커밋
git log --all --diff-filter=A -- '*.env*' 2>/dev/null

# 4. Supabase 키 노출
grep -rn 'SUPABASE_SERVICE_ROLE\|supabase_service_role' src/ --include='*.ts' --include='*.tsx' | grep -v 'process\.env'
```

### XSS
```bash
# 1. dangerouslySetInnerHTML
grep -rn 'dangerouslySetInnerHTML' src/

# 2. 사용자 입력이 직접 DOM에 삽입
grep -rn 'innerHTML\|outerHTML\|document\.write' src/

# 3. URL 파라미터를 검증 없이 사용
grep -rn 'searchParams\.get\|router\.query\|params\.' src/ --include='*.tsx'

# 4. 사용자 입력(동화 제목, 닉네임, 채팅)이 sanitize 없이 렌더링
grep -rn 'title\|nickname\|content' src/components/ --include='*.tsx' | grep -v 'className\|import'
```

### 인증·인가
```bash
# API 라우트별 인증 체크 매트릭스 생성
for route in $(find src/app/api -name 'route.ts' 2>/dev/null); do
  has_auth=$(grep -c 'getUser\|createServerClient\|auth()\|resolveUser' "$route" 2>/dev/null || echo 0)
  has_rls=$(grep -c 'service_role\|serviceRole' "$route" 2>/dev/null || echo 0)
  methods=$(grep -oE 'export.*function (GET|POST|PUT|PATCH|DELETE)' "$route" | grep -oE 'GET|POST|PUT|PATCH|DELETE')
  echo "$route | auth=$has_auth | service_role=$has_rls | methods=$methods"
done

# RLS 정책 확인 (Supabase)
find supabase/migrations -name '*.sql' | sort | xargs grep -l 'CREATE POLICY\|ALTER POLICY' 2>/dev/null
```

### 결제 보안
```bash
# Stripe 웹훅 서명 검증
grep -rn 'stripe\.webhooks\.constructEvent\|webhook.*secret\|signature' src/app/api/webhooks/

# 클라이언트에서 가격 조작 가능 여부
grep -rn 'price\|amount\|quantity\|4900\|18900' src/app/api/checkout/ src/app/api/payments/ 2>/dev/null

# 티켓 차감 원자성 (race condition)
grep -rn 'free_stories_remaining\|decrement\|consume_ticket' src/lib/supabase/ --include='*.ts'
```

### 프롬프트 인젝션 (mamastale 특화)
```bash
# 사용자 입력이 프롬프트에 삽입되는 경로
grep -rn 'sanitizeUserInput\|escapePromptValue' src/lib/anthropic/ --include='*.ts'

# JSON.stringify로 비위생 삽입되는 경로
grep -rn 'JSON\.stringify.*onboarding\|JSON\.stringify.*user' src/app/api/ --include='*.ts'

# 선생님 모드 Phase 태그 탈출 가능 여부
grep -rn '\[GENERATE_READY\]\|\[SP\|Phase\|READING_GUIDE' src/lib/anthropic/teacher-prompts.ts
```

### CSRF / Rate Limit
```bash
# Rate Limit 설정
grep -rn 'rateLimit\|rate.limit\|rateLimiter\|X-RateLimit' src/ --include='*.ts'

# CORS 설정
grep -rn 'Access-Control-Allow-Origin\|cors' src/ --include='*.ts' 2>/dev/null
```
