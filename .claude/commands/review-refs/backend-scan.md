# 백엔드 스캔 전략 — mamastale 전용

## 자동 스캔 명령

### 1. API 라우트 전수 조사
```bash
for route in $(find src/app/api -name 'route.ts' 2>/dev/null | sort); do
  methods=$(grep -oE 'export (async )?function (GET|POST|PUT|PATCH|DELETE)' "$route" | grep -oE 'GET|POST|PUT|PATCH|DELETE' | tr '\n' ',')
  auth=$(grep -c 'getUser\|auth()\|createServerClient\|resolveUser' "$route" 2>/dev/null || echo 0)
  validation=$(grep -c 'z\.\|zod\|parse(' "$route" 2>/dev/null || echo 0)
  errorHandling=$(grep -c 'try\s*{' "$route" 2>/dev/null || echo 0)
  echo "$route | methods=$methods | auth=$auth | validation=$validation | try-catch=$errorHandling"
done
```

### 2. N+1 쿼리 패턴
```bash
# for/map 루프 안에서 DB 호출하는 패턴 (N+1의 전형)
grep -rn -A5 'for\s*(.*of\|let.*=.*0\|\.map(' src/app/api/ --include='*.ts' 2>/dev/null | grep -B2 'supabase\.\|\.from(' 2>/dev/null

# select('*') 사용 (필요한 컬럼만 선택하지 않음)
grep -rn "select('\*')\|\.select()" src/ --include='*.ts' 2>/dev/null
```

### 3. 에러 핸들링
```bash
# fetch/API 호출이 try-catch 없이 사용되는 곳
grep -rn 'await.*fetch\|await.*anthropic\|await.*supabase' src/app/api/ --include='*.ts' -l 2>/dev/null | while read f; do
  total_awaits=$(grep -c 'await' "$f" 2>/dev/null || echo 0)
  try_blocks=$(grep -c 'try\s*{' "$f" 2>/dev/null || echo 0)
  echo "$f | awaits=$total_awaits | try-catch=$try_blocks"
done
```

### 4. TypeScript 안전성
```bash
# any 타입 사용
grep -rn ': any\b\|as any\b' src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.test.'

# Non-null assertion (!) 남용
grep -rn '\w!\.\|\w!\[' src/ --include='*.ts' --include='*.tsx' | grep -v node_modules
```

### 5. 원자성 검증
```bash
# 티켓/포인트 관련 로직에서 읽기-수정-쓰기 패턴
grep -rn 'free_stories_remaining\|decrement\|increment\|ticket\|consume' src/ --include='*.ts'
```

## 심층 리뷰 필수 파일

```
□ src/app/api/chat/route.ts            — AI API 호출, 스트리밍, 에러 복구
□ src/app/api/stories/route.ts         — 동화 CRUD, 티켓 차감 원자성
□ src/app/api/checkout/route.ts        — Stripe 결제 플로우
□ src/app/api/webhooks/stripe/route.ts — 웹훅 멱등성(idempotency)
□ src/app/api/teacher/stream/route.ts  — 선생님 모드 스트리밍
□ src/app/api/teacher/session/route.ts — 선생님 모드 세션, Zod 검증
□ src/app/api/teacher/generate/route.ts — 선생님 모드 동화 생성
□ src/lib/supabase/tickets.ts          — 원자적 카운터
□ src/lib/anthropic/model-router.ts    — 모델 라우팅 로직
□ src/lib/hooks/useChat.ts             — 서버/클라이언트 상태 동기화
□ src/lib/hooks/useTeacherStore.ts     — 선생님 모드 상태 관리
```

## API 라우트별 체크 매트릭스

```
각 API 라우트에 대해:
□ 인증 체크 존재? (auth > 0) — resolveUser() 패턴 사용 여부
□ 입력 검증? (validation > 0) — Zod 스키마 적용 여부
□ 에러 핸들링? (try-catch가 await 수의 50% 이상)
□ 올바른 HTTP 상태 코드 반환?
□ 응답 형식 일관성?

하나라도 0이면 해당 라우트를 심층 리뷰 대상으로 표시
```

## mamastale 특화 분석 관점

```
- 모든 DB 쿼리의 .eq(), .match() 조건이 인덱스를 타는가?
  → teacher_stories(teacher_id), teacher_sessions(teacher_id) 인덱스 존재 확인
- Supabase RPC 호출이 원자적인가? (BEGIN/COMMIT 또는 단일 SQL)
- AI API 타임아웃 설정은? AbortController 적용 여부
- 선생님 모드의 Phase 전환 로직이 서버에서 검증되는가?
- Edge Runtime 제한: fs, path, crypto.randomBytes 등 Node.js 전용 API 사용 여부
```
