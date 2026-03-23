# 마마스테일 활동지 서비스 기술 레퍼런스 가이드

마마스테일의 활동지 서비스는 현재 확정된 스택 위에 **5개의 신규 모듈**(API Route, Supabase 테이블 3개, 프론트 페이지, PDF 파이프라인, 티켓 과금)을 구현해야 한다. 이 가이드는 각 모듈의 최적 구현 경로를 프로덕션 검증된 레퍼런스 기반으로 제시하며, 가장 시급한 인프라 리스크인 **@cloudflare/next-on-pages의 폐기 대응**까지 포함한다. 핵심 결론: 활동지 생성에는 **Haiku 4.5 + 구조화 출력**(GA), PDF 변환에는 **Cloudflare Browser Rendering REST API**, 온보딩 UI에는 **Zustand + Framer Motion**, 과금에는 **PostgreSQL RPC 함수 기반 원자적 티켓 차감**이 최적 경로다.

---

## 1. Claude 구조화 출력은 Haiku 4.5에서 GA로 제공된다

활동지 콘텐츠 생성의 핵심은 Claude API에서 **구조화 JSON 출력**을 안정적으로 받는 것이다. Anthropic의 구조화 출력 기능은 2025년 말 GA로 승격되었으며, `output_config.format` 파라미터로 JSON Schema를 지정하면 **디코더 레벨에서 문법 제약**(constrained decoding)이 걸려 스키마 일치가 보장된다.

**지원 모델과 핵심 제약**: Claude Haiku 4.5, Sonnet 4.5/4.6, Opus 4.5/4.6이 GA로 지원된다. **Haiku 3.5는 구조화 출력을 지원하지 않는다** — 활동지용으로 반드시 Haiku 4.5(`claude-haiku-4-5`)로 마이그레이션해야 한다. 최초 요청 시 문법 캐싱에 **100–300ms 오버헤드**가 발생하나 24시간 캐시된다. 스키마 제한은 최대 5단계 중첩, 200개 프로퍼티, 24개 optional 파라미터이며, `additionalProperties: false`가 필수다.

### SDK 선택: Vercel AI SDK vs Anthropic SDK 직접 사용

**Vercel AI SDK**(`ai` + `@ai-sdk/anthropic`, ★22.2k)의 `generateObject()` 함수는 Zod 스키마를 직접 받아 자동 변환하고, TypeScript 타입 추론까지 제공한다. `structuredOutputMode: 'outputFormat'` 옵션을 설정하면 Anthropic 네이티브 구조화 출력을 사용한다. 다만 **Issue #12298**에서 이미 deprecated된 `output_format` 파라미터를 보내는 버그가 보고되었으므로 주의가 필요하다.

**Anthropic TypeScript SDK**(`@anthropic-ai/sdk`, ★1.7k)는 `zodOutputFormat()` 헬퍼를 제공하여 Zod 스키마를 JSON Schema로 자동 변환한다. 또한 **Zod v4**는 네이티브 `z.toJSONSchema()`를 지원하므로 외부 패키지(`zod-to-json-schema`는 2025년 11월 deprecated)가 필요 없다.

```typescript
// Vercel AI SDK 접근 (권장)
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5'),
  schema: WorksheetSchema,  // Zod 스키마 직접 전달
  prompt: '5세 아이를 위한 ㄱㄴㄷ 학습 활동지를 생성하세요.',
  providerOptions: {
    anthropic: { structuredOutputMode: 'outputFormat' }
  }
});
return Response.json(object); // 타입 추론된 객체 즉시 반환
```

### Edge Runtime 호환성과 런타임 선택

Anthropic SDK는 **Cloudflare Workers와 Vercel Edge Runtime을 공식 지원**한다. 그러나 `@opennextjs/cloudflare` 어댑터는 **Node.js 런타임만 지원**하므로, API Route에서 `export const runtime = 'edge'`를 제거해야 한다. Node.js 런타임에서 Anthropic SDK는 완전히 호환되며, 번들 크기 이슈도 없다. 만약 Edge 런타임이 반드시 필요한 경우, SDK 없이 `fetch()`로 Anthropic REST API를 직접 호출하는 패턴이 가장 안전하다.

**활동지 API Route 최적 패턴**: Non-streaming JSON 응답이므로 단순히 `Response.json(object)`를 반환하면 된다. Next.js 15에서 POST 핸들러는 기본 dynamic이며, `params`는 Promise로 await해야 한다.

---

## 2. 온보딩 위저드는 Zustand + Framer Motion이 최적이다

활동지 선택 → 온보딩 질문(3~5스텝) → 생성 → 다운로드의 선형 플로우에서는 **toss/use-funnel을 건너뛰는 것**이 옳다. `@use-funnel/next`(★543)는 App Router를 지원하지만 v0.0.22의 프리릴리즈 상태이며, 분기(branching) 퍼널에 최적화된 도구라 선형 플로우에는 과잉 설계다.

### Framer Motion 방향 인식 애니메이션

스텝 전환의 핵심은 **AnimatePresence의 `custom` prop으로 방향(forward/back)을 전달**하는 패턴이다. 퇴장하는 컴포넌트는 React에서 언마운트되지만 Framer Motion이 DOM에 유지하므로, `custom` prop을 AnimatePresence와 자식 motion.div 모두에 전달해야 최신 방향값을 읽을 수 있다.

```typescript
const variants = {
  enter: (dir: 'forward'|'back') => ({ x: dir === 'forward' ? '100%' : '-100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: 'forward'|'back') => ({ x: dir === 'forward' ? '-100%' : '100%', opacity: 0 }),
};
// mode="wait" → 퇴장 완료 후 입장 시작, initial={false} → 첫 렌더링 애니메이션 방지
```

**Framer Motion**(현재 `motion` 패키지로 리브랜딩, ★25k+)은 React 애니메이션의 사실상 표준이며, CSS 변수 기반 Tailwind CSS 4와 자연스럽게 연동된다.

### Tailwind CSS 4와 카드 선택 UI

Tailwind CSS 4(★86k+, 2025년 1월 릴리즈)의 핵심 변화는 **CSS-first 설정**(`@theme {}` 블록)과 **oklch 색공간**, **내장 컨테이너 쿼리**다. 디자인 토큰을 CSS 변수로 정의하면 Framer Motion 애니메이션에서 `var(--color-primary-500)`를 직접 참조할 수 있다.

카드 선택 UI에는 **hidden radio + peer-checked 패턴**이 최적이다. `<input type="radio" class="peer sr-only" />` 뒤에 `<div class="peer-checked:border-primary-500 peer-checked:bg-primary-100">`로 스타일링하면 접근성과 시각적 피드백을 동시에 확보한다.

### Zustand 위저드 스토어 패턴

**Zustand**(★48k+, ~1KB 번들)의 `persist` 미들웨어로 `localStorage`에 초안을 저장하면, 부모가 아이를 돌보다 중단한 후 돌아와도 진행 상태가 유지된다. `partialize` 옵션으로 UI 일시 상태(`direction`, `generationStatus`)를 제외하고 데이터만 영속화한다. 스텝별 Zod 유효성 검사를 붙여 `goNext()` 호출 전 각 스텝의 필수 입력을 확인한다. SSR 하이드레이션 불일치를 방지하려면 `useEffect`로 하이드레이션 완료를 감지한 뒤 렌더링해야 한다.

### 모바일 터치 최적화

WCAG 2.5.5 AAA 기준 **최소 터치 타겟 44×44px**, Material Design 권장 **48×48dp**를 준수한다. 한 손으로 아이를 안은 채 조작하는 부모 사용자를 고려해 **48px 이상을 권장**한다. 스와이프 제스처는 Framer Motion의 `drag="x"` + `onDragEnd`로 구현하되, 항상 버튼 내비게이션을 병행 제공한다. 하단 CTA는 `fixed bottom-0`으로 엄지 도달 범위에 배치하고, `pb-safe`로 노치 디바이스 안전 영역을 확보한다.

---

## 3. 티켓 시스템은 PostgreSQL RPC 함수가 원자성을 보장한다

### 핵심 패턴: SELECT FOR UPDATE + RPC

Supabase의 `supabase-js` 클라이언트는 멀티스테이트먼트 트랜잭션을 네이티브로 지원하지 않는다. 공식 우회 방법은 **PostgreSQL 함수를 `.rpc()`로 호출**하는 것이며, PostgREST가 각 RPC 호출을 자동으로 트랜잭션으로 래핑한다.

```sql
CREATE OR REPLACE FUNCTION public.consume_ticket(p_user_id UUID, p_ticket_count INTEGER DEFAULT 1)
RETURNS BOOLEAN SET search_path = '' AS $$
DECLARE v_current INTEGER;
BEGIN
  SELECT ticket_balance INTO v_current FROM public.user_tickets
  WHERE user_id = p_user_id FOR UPDATE;  -- 행 수준 잠금
  IF v_current IS NULL OR v_current < p_ticket_count THEN RETURN FALSE; END IF;
  UPDATE public.user_tickets SET ticket_balance = ticket_balance - p_ticket_count, updated_at = NOW()
  WHERE user_id = p_user_id;
  INSERT INTO public.ticket_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_ticket_count, 'consume', 'worksheet_generation');
  RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
```

더 단순한 케이스에는 **단일 UPDATE문**(`UPDATE user_tickets SET ticket_balance = ticket_balance - 1 WHERE user_id = $1 AND ticket_balance > 0 RETURNING ticket_balance`)이 그 자체로 원자적이다.

### RLS 정책: 읽기만 허용, 쓰기는 service_role 전용

사용자는 `SELECT` 정책으로 자기 티켓 잔고만 읽을 수 있고, **INSERT/UPDATE/DELETE 정책을 만들지 않는다**. 모든 수정은 `service_role` 키를 사용하는 서버 사이드에서만 수행되며, `service_role`은 RLS를 완전히 우회한다. RLS 성능 최적화 핵심: `auth.uid()`를 `(SELECT auth.uid())`로 서브셀렉트로 감싸면 PostgreSQL의 initPlan 캐싱이 활성화되어 대규모 테이블에서 **100배 이상 성능 향상**이 가능하다.

### 결제 웹훅 → 티켓 충전 통합

**Toss Payments**는 confirm-then-add 패턴을 따른다: 클라이언트 결제 성공 → `successUrl`로 리다이렉트 → 서버에서 `POST /v1/payments/confirm` 호출 → 성공 시 `add_tickets_from_purchase` RPC로 티켓 추가. **Stripe**은 `checkout.session.completed` 웹훅 → 동일 RPC 호출. 양쪽 모두 **`idempotency_key`(UNIQUE 제약)**로 웹훅 재시도에 의한 이중 충전을 방지한다.

**티켓 로직 배치 결정**: Supabase Edge Functions 대신 **Next.js API Routes를 권장**한다. 같은 코드베이스에서 관리 가능하고, Toss Payments SDK와 Stripe SDK가 Node.js 네이티브이며, 원자성은 어차피 DB 레벨 RPC 함수가 보장한다.

### pg_cron으로 월간 무료 티어 리셋

Supabase에 내장된 **pg_cron**(v1.6.4)으로 매월 1일 자동 무료 티켓 지급이 가능하다. `cron.schedule('monthly-free-tier', '0 0 1 * *', $$SELECT public.monthly_free_tier_reset()$$)`로 설정하며, 함수 내부에서 `idempotency_key`를 `'free_tier_' || year_month || '_' || user_id`로 설정해 중복 실행을 방지한다.

---

## 4. PDF 파이프라인은 Cloudflare Browser Rendering이 최적 경로다

Cloudflare Workers/Pages의 Edge Runtime은 **바이너리 실행(Puppeteer, wkhtmltopdf)이 불가능**하다. V8 isolate 환경이라 파일시스템 접근과 자식 프로세스 생성이 차단된다. 이 제약 하에서 5가지 대안을 분석한 결과, **Cloudflare Browser Rendering REST API**가 마마스테일에 가장 적합하다.

### Cloudflare Browser Rendering이 1순위인 이유

Cloudflare 자체 헤드리스 Chrome 서비스로, `POST /client/v4/accounts/{id}/browser-rendering/pdf`에 HTML을 보내면 PDF 바이트를 반환한다. **네이티브 Cloudflare 통합**이므로 외부 서비스가 필요 없고, 풀 CSS(Grid, Flexbox, `@page`, `@media print`) 지원, SVG 일러스트 렌더링, `@font-face`를 통한 한글 폰트(Pretendard, Noto Sans CJK) 로딩이 완벽하다. Workers Paid 플랜($5/월)에서 **월 10시간 무료** — 활동지 1건당 2~5초 기준으로 **월 7,000~18,000건** 생성이 포함 범위 내다.

### 대안별 비교와 판단

- **@react-pdf/renderer**(★16.5k) — 2순위 후보. 순수 클라이언트 사이드 가능하나, 자체 레이아웃 엔진(Yoga flexbox)을 사용해 일반 CSS를 쓸 수 없고, CJK 폰트 지원이 불안정하다(TTF만 가능, Variable 폰트 미지원). Cloudflare Pages에서는 yoga-layout WASM을 ASM.js로 패치해야 동작한다.
- **Gotenberg**(★11.2k) on Cloud Run — 최고 품질이나 외부 인프라 관리 부담. `gotenberg/gotenberg:8-cloudrun` 이미지에 커스텀 Pretendard TTF를 추가. 콜드 스타트 ~11초 문제로 `--min-instances=1` 설정 시 월 $25~35 추가 비용.
- **jsPDF**(★29k) + html2canvas — **비추천**. 래스터 이미지 기반 출력으로 텍스트 선택 불가, CJK 폰트 번들 15~30MB, 품질이 활동지에 부적합하다.
- **Supabase Edge Functions** — **비추천**. Deno 런타임에서 pdfkit의 `Deno.readFileSync`가 blocklisted되는 등 호환성 문제가 심각하다.

### 한글 폰트 임베딩 전략

Cloudflare Browser Rendering 사용 시 폰트는 CDN에서 WOFF2/TTF를 `@font-face`로 로딩하면 브라우저가 처리한다. Pretendard는 jsDelivr CDN에서 제공되며, **반드시 TTF 포맷**을 사용해야 한다(OTF는 PDF 호환성 문제 있음). 폰트 서브셋팅은 브라우저가 자동 처리하므로 파일 크기 걱정이 없다.

---

## 5. 따뜻한 손그림풍 디자인 시스템 구축 가이드

### 폰트 조합: Cafe24 동동 + 마루부리 + 교보 손글씨

| 용도 | 폰트 | 소스 | 라이선스 |
|------|------|------|----------|
| 제목 (통통 튀는) | **Cafe24 동동** | fonts.cafe24.com | 상업적 무료 |
| 본문 (따뜻한 가독성) | **마루부리 (Maru Buri)** | Google Fonts / 눈누 | SIL OFL |
| 손글씨 악센트 | **교보 손글씨 2024** | store.kyobobook.co.kr | 상업적 무료 |
| 시스템 폴백 | Pretendard → Noto Sans KR | GitHub / Google Fonts | SIL OFL |

눈누(noonnu.cc)는 CDN 코드 스니펫을 제공하는 한국 최대 무료 폰트 플랫폼이고, Cafe24 폰트 전체와 네이버 클로바 손글씨 109종은 모두 상업적 사용이 무료다. **일곱살 꼬마체**(실제 7세 아이의 필체)는 마마스테일의 타겟 연령과 완벽히 맞는 악센트 옵션이다.

### 일러스트 스택: Rough.js + CocoMaterial

**Rough.js**(roughjs.com, MIT) — 9kB 라이브러리로 프로그래밍 방식의 손그림풍 SVG를 생성한다. roughness, bowing, fill style(hachure, zigzag, dots)를 제어하여 활동지 테두리, 박스, 프레임을 동적으로 그릴 수 있다. **CocoMaterial**(cocomaterial.com, CC BY) — 700+ 손그림 스틱 일러스트로, 교사가 실제 활동지에 사용한 사례가 있다. **Open Peeps**(CC0, 584,688+ 조합 가능) — 다양한 인종/성별의 캐릭터를 조합 생성한다. Svg2Roughjs(MIT)로 깨끗한 SVG를 손그림풍으로 후처리할 수도 있다.

### 2025-2026 워크시트 디자인 트렌드

Twinkl과 Teachers Pay Teachers에서 관찰되는 핵심 트렌드: **뮤트 파스텔 팔레트**(블러쉬 핑크, 파우더 블루, 버터 옐로우), **손그림/두들 테두리**(TPT에서 가장 인기 있는 프레임 유형), **미니멀리즘**(과잉 자극 방지를 위한 넉넉한 여백), **자연 영감/바이오필릭 디자인**(잎사귀 모티프, 어시 톤), **캐릭터 기반 가이드**(반복 등장하는 마스코트). PANTONE 2025 올해의 색 **Mocha Mousse**(17-1230)의 영향으로 따뜻한 갈색 계열이 크림/소프트 톤과 조합되는 추세다.

**마마스테일 권장 컬러 시스템**: 배경 `#FFF8F0`(따뜻한 크림), 주요 악센트 `#FFB5A7`(소프트 코럴), 보조 `#B8E0D2`(민트), 텍스트 `#4A4A4A`(소프트 다크 그레이, 순수 블랙이 아님), 스케치 라인 `#6B6B6B`(따뜻한 회색).

### React → HTML → PDF 렌더링 파이프라인

Jinja2 대신 **`ReactDOMServer.renderToStaticMarkup()`**으로 워크시트 React 컴포넌트를 정적 HTML 문자열로 변환한다. CSS `@page { size: A4 portrait; margin: 15mm; }`와 `break-inside: avoid`로 A4 레이아웃을 제어하고, Rough.js SVG 출력을 HTML에 직접 임베딩한다. 이 HTML 문자열을 Cloudflare Browser Rendering API에 전달하면 완성된 PDF가 생성된다.

---

## 6. 모델 라우팅에 Haiku 4.5를 추가하고 Langfuse로 관측한다

### Haiku 4.5 마이그레이션 체크리스트

Haiku 4.5는 **2025년 10월 15일 GA 출시**되었으며, 모델 ID는 `claude-haiku-4-5`(별칭) 또는 `claude-haiku-4-5-20251001`(스냅샷)이다. Haiku 3.5 대비 핵심 차이: **64K 최대 출력 토큰**(3.5는 8K), **200K 컨텍스트 윈도우**, **구조화 출력 GA 지원**, 확장 사고(extended thinking) 최초 지원. 가격은 입력 $1/MTok, 출력 $5/MTok으로 3.5 대비 약 25% 인상이나, Sonnet 4 수준 품질을 2~5배 빠른 속도로 제공한다.

**Breaking change 주의**: `temperature`와 `top_p`를 동시에 지정할 수 없다(Haiku 4.5에서 에러 발생). `token-efficient-tools` 베타 헤더는 Claude 4+ 모델에서 네이티브로 처리되므로 제거해야 한다.

마마스테일의 업데이트된 모델 라우팅은 이렇게 된다: 메인 동화 생성 → `claude-sonnet-4-5`, 복합 태스크 → `claude-opus-4-5`, 브리프/요약 → `claude-haiku-4-5`, **활동지 생성 → `claude-haiku-4-5` + `output_config.format`**.

### TypeScript 프롬프트 관리 패턴

Jinja2 대신 **TypeScript 함수 기반 프롬프트 빌더**를 권장한다. 각 프롬프트를 `system(params)` / `user(params)` 함수로 정의하고, Zod 스키마를 `outputSchema`로 함께 관리하면 타입 안전성이 보장된다. 복잡한 프롬프트는 `.md` 파일에 저장하되 TypeScript 인터페이스로 래핑한다. 프로덕션 버전 관리와 A/B 테스트에는 **Langfuse**를 사용한다.

### Langfuse 통합 (★23.5k, MIT, 셀프호스트 가능)

Langfuse는 Anthropic SDK와 **OpenTelemetry 기반 자동 계측**으로 통합된다. `@arizeai/openinference-instrumentation-anthropic` + `@langfuse/otel`을 설치하고 `NodeSDK`에 `LangfuseSpanProcessor`를 등록하면, 모든 Anthropic API 호출이 자동 추적된다. 프롬프트 버전별 비용, 지연시간, 품질 스코어를 대시보드에서 비교할 수 있고, `production` / `prod-a` / `prod-b` 레이블로 A/B 테스트를 실행한다. CI에서는 **Promptfoo**(현재 OpenAI 인수)로 프롬프트 변경의 회귀 테스트를 자동화한다. 셀프호스트(무료) → Cloud Core($29/월)로 확장하는 경로를 권장한다.

---

## 7. OpenNext 마이그레이션은 1~3개월 내에 실행하라

**@cloudflare/next-on-pages는 완전히 폐기되었다.** npm에 deprecated 표시, GitHub README에 "OpenNext Cloudflare adapter를 대신 사용하라"고 명시, 마지막 버전 1.13.16 이후 **6개월간 업데이트 없음**, 보안 패치도 중단되었다. 2025년 8월에는 모든 next-on-pages 배포에서 "Not Found" 에러가 발생한 보고가 있다. Cloudflare Pages 자체도 2025년 4월에 deprecated되어, 모든 신규 기능(Secrets Store, Workflows, Containers)은 Workers 전용이다.

### OpenNext for Cloudflare의 현재 성숙도

**`@opennextjs/cloudflare`**(★~1.7k, v1.17.1)는 Cloudflare 공식 권장 어댑터로, Next.js 15의 App Router, API Routes, ISR, Middleware, Server Actions, Streaming을 모두 지원한다. 정부 사이트(techforce.gov, safedc.gov)를 포함한 프로덕션 배포 사례가 다수 있다. 핵심 제약: **Edge Runtime을 지원하지 않으므로** 모든 `export const runtime = 'edge'`를 제거해야 한다(Node.js 런타임이 기본이며 이것이 오히려 호환성에 유리).

### 마이그레이션 실행 계획

자동 마이그레이션 명령 `npx @opennextjs/cloudflare migrate`가 대부분의 설정을 처리한다. 수동으로 해야 할 핵심 작업: `getRequestContext` → `getCloudflareContext` 교체, `setupDevPlatform()` 제거, `export const runtime = 'edge'` 전부 삭제, 빌드 커맨드를 `opennextjs-cloudflare build`로 변경, 배포 대상이 Pages에서 Workers로 전환(DNS 커스텀 도메인 포인팅 변경 필요, 2~5초 다운타임 예상).

**정적 export 대안은 불가능하다.** `output: 'export'` 설정 시 API Routes, Server Actions, 미들웨어가 모두 비활성화되어 활동지 생성 기능 자체가 작동하지 않는다.

---

## 전체 아키텍처 요약과 결론

활동지 서비스의 전체 데이터 플로우는 다음과 같다:

```
사용자 → /worksheet 페이지 (Zustand 위저드 + Framer Motion)
  → 서재에서 책 선택 (카드 UI, peer-checked 패턴)
  → 온보딩 3~5 질문 (스텝별 Zod 유효성 검사)
  → POST /api/worksheet/generate
    → consume_ticket RPC (원자적 차감)
    → Haiku 4.5 + output_config.format (구조화 JSON 반환)
    → ReactDOMServer.renderToStaticMarkup (HTML 변환)
    → Cloudflare Browser Rendering API (HTML → PDF)
    → Supabase Storage에 PDF 저장
  → PDF 다운로드 링크 반환
```

이 가이드에서 제시한 모든 기술 선택은 프로덕션 검증과 GitHub Star 기준을 충족한다: Vercel AI SDK(★22.2k), Zustand(★48k+), Framer Motion(★25k+), Tailwind CSS(★86k+), Gotenberg(★11.2k), @react-pdf/renderer(★16.5k), Langfuse(★23.5k), OpenNext Cloudflare(★1.7k). 가장 시급한 액션 아이템은 **OpenNext 마이그레이션**(보안 패치 중단 상태)이며, 활동지 기능 개발은 마이그레이션과 병행하여 동일 타임라인(4~6주)에 진행하는 것을 권장한다.