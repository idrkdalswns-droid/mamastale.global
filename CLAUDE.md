# CLAUDE.md — MammasTale (엄마엄마동화) Project Memory

> 이 파일은 Claude Code가 프로젝트를 이해하고 일관된 작업을 수행하기 위한 영구 기억 파일입니다.
> 모든 새 세션에서 자동으로 읽히며, `/clear` 후에도 유지됩니다.

---

## 프로젝트 개요

**mamastale**은 어머니들의 감정적 이야기와 상처를 AI 대화를 통해 10장면 동화로 변환하는 치유적 내러티브 B2C SaaS입니다.

- **타겟 사용자**: 산후우울증, 양육 번아웃, 정체성 위기를 겪는 한국 어머니들
- **핵심 가치**: 어머니의 상처가 아이를 위한 사랑의 이야기로 변환
- **소요 시간**: 15~20분 대화 → 10장면 동화 완성
- **언어**: 한국어 (ko) 기본, 6개 언어 지원 (ko, en, ja, zh, ar, fr)

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| **프레임워크** | Next.js 14 (App Router) + React 18 |
| **언어** | TypeScript 5.9 (strict mode) |
| **스타일링** | Tailwind CSS 3.4 + CSS Variables (다크모드) + Framer Motion |
| **상태관리** | Zustand 5 (useChatStore, useSettingsStore) |
| **AI/LLM** | Anthropic Claude API (`claude-sonnet-4-20250514`, SDK ^0.78) |
| **DB/Auth** | Supabase (PostgreSQL + RLS + PKCE Auth) |
| **결제** | Stripe + Toss Payments (한국 결제) |
| **PDF** | @react-pdf/renderer (서버사이드 HTML) |
| **검증** | Zod (스키마), 자체 profanity filter |
| **테스트** | Vitest 4 |
| **배포** | Cloudflare Pages (standalone output, Edge Runtime) |
| **패키지** | clsx, tailwind-merge, react-hot-toast |

---

## 개발 환경 설정

### Node.js (nvm 필수)

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 주요 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm test             # Vitest 단일 실행
npm run test:watch   # Vitest 감시 모드
npm run lint         # ESLint
```

### 환경 변수 (.env.local)

```
# 필수
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=

# 결제 (선택)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_TICKET_PRICE_ID=
STRIPE_BUNDLE_PRICE_ID=
TOSS_SECRET_KEY=
TOSS_WIDGET_SECRET_KEY=
TOSS_WEBHOOK_SECRET=

# 분석 (선택)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=

# 접근 제어 (선택)
SITE_ACCESS_KEY=

# 앱
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 프로젝트 구조

```
mamastale/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 그룹 (login, signup, reset-password)
│   │   ├── (protected)/              # 보호 라우트 (chat, dashboard, story)
│   │   ├── access/                   # SITE_ACCESS_KEY 게이트
│   │   ├── api/                      # Edge API 라우트 (20개)
│   │   ├── community/                # 커뮤니티 (목록 + 상세)
│   │   ├── library/                  # 내 서재 (목록 + 상세)
│   │   ├── payment/                  # 결제 성공/실패
│   │   ├── pricing/                  # 가격표
│   │   ├── reviews/                  # 사용자 후기
│   │   ├── privacy/ & terms/         # 법적 페이지
│   │   ├── page.tsx                  # 메인 랜딩 + SPA 플로우
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── globals.css               # CSS Variables + 다크모드
│   │   └── middleware.ts             # 보안 헤더 + 접근 제어
│   ├── components/
│   │   ├── ads/                      # AdBanner
│   │   ├── auth/                     # SignupModal
│   │   ├── chat/                     # ChatContainer, ChatInput, MessageBubble, PhaseHeader, PhaseTransition, TypingIndicator 등
│   │   ├── community/                # CommentSection, LikeButton
│   │   ├── feedback/                 # FeedbackWizard, CommunityPage
│   │   ├── landing/                  # 랜딩 섹션
│   │   ├── layout/                   # CookieConsent, ConsentGatedScripts
│   │   ├── onboarding/               # OnboardingSlides (4단계 소개 + 연령 선택)
│   │   ├── reviews/                  # ReviewSection
│   │   ├── story/                    # StoryViewer, StoryEditor, BookSpine, Bookshelf, PDFDownloadButton, SceneCard, StoryCard
│   │   └── ui/                       # ErrorBoundary, ThemeToggle, WatercolorBlob
│   └── lib/
│       ├── anthropic/                # AI 클라이언트, 시스템 프롬프트 v2.0, 페이즈 감지
│       ├── constants/                # phases.ts (4단계 정의), design-tokens.ts
│       ├── hooks/                    # useChat (Zustand), useAuth, useSwipe, useSettings
│       ├── pdf/                      # generator.tsx (@react-pdf/renderer)
│       ├── stripe/                   # Stripe 통합
│       ├── supabase/                 # client.ts, server.ts, server-api.ts, tickets.ts
│       ├── types/                    # chat.ts, story.ts
│       └── utils/                    # story-parser.ts, validation.ts
├── supabase/
│   └── migrations/                   # SQL 마이그레이션 9개 (001~009)
├── scripts/                          # 시뮬레이션 스크립트 (persona, expert)
├── docs/                             # 사용자 페르소나, 전문가 리포트
├── public/                           # fonts, images, robots.txt
└── 설정 파일들                        # package.json, tsconfig, tailwind, vitest, next.config
```

---

## 핵심 아키텍처

### 4단계 치유적 대화 엔진

| 단계 | 이름 | 아이콘 | 악센트 | 이론 | 규칙 |
|------|------|--------|--------|------|------|
| 1 | 공감적 상담사 | 🫧 | `#7FBFB0` | 있는 그대로 들어줘요 | 판단 없는 무조건적 수용, 공감과 반영 |
| 2 | 소크라테스식 철학자 | 🌿 | `#E07A5F` | 새로운 시선으로 바라봐요 | 증거 확인, 탈중심화, 예외적 결과 탐색 |
| 3 | 은유의 마법사 | ✨ | `#8B6AAF` | 이야기로 바꿔줘요 | 고통을 동화 캐릭터로 의인화, 세계관 구축 |
| 4 | 동화 편집장 | 📖 | `#C4956A` | 동화로 완성해요 | 도입→갈등→시도→해결→교훈 |

**규칙**:
- 단계 전환은 전진만 가능 (되돌아갈 수 없음)
- 단계당 최대 10턴 (초과 시 자동 전환)
- 전환 시 600ms 애니메이션

### 10장면 동화 구조

```
[INTRO 1]     → 장면 1 (도입 1)
[INTRO 2]     → 장면 2 (도입 2)
[CONFLICT 1]  → 장면 3 (갈등 1)
[CONFLICT 2]  → 장면 4 (갈등 2)
[ATTEMPT 1]   → 장면 5 (시도 1)
[ATTEMPT 2]   → 장면 6 (시도 2)
[RESOLUTION 1]→ 장면 7 (해결 1)
[RESOLUTION 2]→ 장면 8 (해결 2)
[WISDOM 1]    → 장면 9 (교훈 1)
[WISDOM 2]    → 장면 10 (교훈 2)
```

### 화면 상태 머신 (page.tsx)

```
landing → onboarding → chat → edit → story → feedback → community → (restart)
```

### 인증 흐름

- **Supabase Auth** (PKCE 방식)
- Cookie 인증 우선, Authorization Bearer 토큰 fallback
- 게스트: 5턴 무료 체험 (로그인 없이)
- 보호 라우트: `/dashboard`, `/library` (미인증 시 → `/login`)

### 티켓 시스템

- `profiles.free_stories_remaining` 으로 관리
- 신규 가입 시 1장 무료
- Stripe/Toss로 추가 구매 (1장 4,900원 / 5장 18,900원)
- 추천 코드로 양쪽 +1장
- 동화 생성 시 원자적(atomic) 차감

---

## 데이터 모델 (Supabase)

### 핵심 테이블

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| `profiles` | 사용자 | id, display_name, locale, free_stories_remaining |
| `sessions` | 채팅 세션 | id, user_id, current_phase (1-4), status |
| `messages` | 대화 기록 | id, session_id, role, content, phase |
| `stories` | 동화 | id, user_id, title, scenes (JSONB), is_public, author_alias, status |
| `subscriptions` | Stripe 동기화 | user_id, stripe_customer_id, plan, status |
| `feedback` | 평가 (5차원) | empathy/insight/metaphor/story/overall (1-5), free_text |

### 커뮤니티 테이블

- `community_likes`, `community_comments`, `comment_reports`
- `referrals` (추천 코드)
- `user_reviews` (사용자 후기)

### RLS (Row Level Security)

- 모든 테이블에 RLS 활성화
- 사용자는 자신의 데이터만 접근 가능
- Service Role Key는 웹훅/관리자 작업에만 사용

---

## API 엔드포인트 (모두 Edge Runtime)

| 경로 | 메서드 | 인증 | 용도 |
|------|--------|------|------|
| `/api/chat` | POST | 선택 | 메인 AI 대화 (Claude 호출) |
| `/api/stories` | GET/POST | 필수 | 동화 목록/생성 (티켓 차감) |
| `/api/stories/[id]` | GET/PATCH | 필수 | 동화 조회/수정 (공유 포함) |
| `/api/story/generate-pdf` | POST | 필수 | PDF HTML 생성 |
| `/api/tickets` | GET | 필수 | 잔여 티켓 조회 |
| `/api/checkout` | POST | 필수 | Stripe 결제 세션 |
| `/api/payments/confirm` | POST | 필수 | Toss 결제 확인 |
| `/api/webhooks/stripe` | POST | 서명 | Stripe 웹훅 |
| `/api/community` | GET | 없음 | 커뮤니티 목록 |
| `/api/community/[id]` | GET | 없음 | 커뮤니티 상세 |
| `/api/community/[id]/like` | GET/POST | 선택 | 좋아요 |
| `/api/community/[id]/comments` | GET/POST | GET=없음/POST=필수 | 댓글 |
| `/api/community/[id]/comments/report` | POST | 필수 | 댓글 신고 |
| `/api/feedback` | POST | 선택 | 피드백 |
| `/api/reviews` | GET/POST | 없음 | 사용자 후기 |
| `/api/referral` | GET/POST | 필수 | 추천 코드 |
| `/api/account/delete` | POST | 필수 | GDPR 삭제 |
| `/api/account/export` | GET | 필수 | GDPR 내보내기 |
| `/api/auth/callback` | GET | 없음 | OAuth 콜백 |
| `/api/verify-access` | POST | 없음 | 접근 게이트 |

---

## 핵심 유틸리티 함수

### 텍스트 처리 파이프라인

```
AI 응답 → parseStoryScenes() → cleanSceneText() → sanitizeSceneText() → DB 저장
DB 조회 → cleanSceneText() → React 렌더링 (자동 이스케이프)
```

- **`sanitizeText()`**: HTML 엔티티 인코딩 + 위험 프로토콜 제거 → **사용자 입력용** (제목, 별명)
- **`sanitizeSceneText()`**: HTML 태그/스크립트 제거, 엔티티 인코딩 안 함 → **AI 생성 텍스트용** (이중 인코딩 방지)
- **`cleanSceneText()`**: 마크다운 제거 + HTML 엔티티 디코딩 (반복 루프로 다중 인코딩 처리) → **표시 시점**
- **`containsProfanity()`**: 한국어 비속어 필터 (NFC 정규화 + 제로 폭 문자 제거 + 특수문자 무시)

### 스토리 파싱 (3단계 전략)

1. **영문 섹션 태그** (우선): `[INTRO 1]`, `[CONFLICT 2]`, `[WISDOM 1]` 등
2. **한국어 장면 태그** (대체): `[장면 1]`, `장면 1:`, `**장면 1**`
3. **번호 목록** (최종): `1.`, `1)` 등

### 페이즈 감지

- `detectPhase()`: `[PHASE:N]` 태그 추출 (대소문자 무관, 공백 허용)
- `stripPhaseTag()`: 응답에서 페이즈 태그 제거
- `isStoryComplete()`: 완료 마커 감지 (WISDOM 1/2, 장면 9/10, 축하합니다)

---

## 상태 관리 (Zustand)

### useChatStore

```typescript
{
  sessionId, messages, currentPhase (1-4), visitedPhases,
  turnCountInCurrentPhase, isLoading, isTransitioning,
  storyDone, completedStoryId, completedScenes,
  storySaved, storySaveError, isFromDraft
}
```

**저장소 키**:
- `mamastale_chat_state` — 인증 리디렉트용 (복원 후 삭제됨)
- `mamastale_chat_draft` — 지속 임시저장 (30일 만료, 명시적 삭제만)

**주요 액션**: `initSession`, `sendMessage`, `persistToStorage`, `saveDraft`, `restoreDraft`, `retrySaveStory`, `reset`

### useSettingsStore

- 폰트 크기: `small`(13px) / `medium`(15px) / `large`(17px)
- 저장소 키: `mamastale-font-size`

### 기타 localStorage 키

- `mamastale_onboarding_done` — 온보딩 완료 여부
- `mamastale_child_age` — 자녀 연령대
- `mamastale_editor_draft` — 편집기 임시저장
- `mamastale_theme` — 테마 (light/dark)

---

## 디자인 시스템

### 컬러 팔레트 (CSS Variables → Tailwind)

| 토큰 | 라이트 (RGB) | 용도 |
|------|-------------|------|
| `--cream` | 251 245 236 | 배경 |
| `--paper` | 254 247 237 | 카드 배경 |
| `--coral` | 224 122 95 | 주요 악센트 (CTA) |
| `--mint-deep` | 127 191 176 | 1단계 악센트 |
| `--brown` | 90 62 43 | 본문 텍스트 |
| `--brown-light` | 139 111 85 | 보조 텍스트 |
| `--brown-pale` | 196 168 130 | 비활성/힌트 |
| `--lavender` | 200 184 216 | 3단계/커뮤니티 |
| `--purple` | 109 76 145 | 3단계 텍스트 |
| `--kakao` | 254 229 0 | 카카오 버튼 |

### 다크 모드

- `"class"` 기반 (Tailwind darkMode)
- `globals.css`에 `.dark` 변수 정의
- `ThemeToggle` 컴포넌트로 전환
- 시스템 설정 감지 (`matchMedia`)

### 타이포그래피

- **세리프**: `'Nanum Myeongjo'`, `'Noto Serif KR'` → 동화 본문, 제목
- **산세리프**: `'Noto Sans KR'`, `'Apple SD Gothic Neo'` → UI, 버튼

### 애니메이션

- `fade-in`, `fade-up`, `scale-up` — 일반 트랜지션
- `msg-slide` — 메시지 버블
- `dot-bounce` — 타이핑 인디케이터
- `bookEntry` — 책장 진입
- Framer Motion — 단계 전환, 축하 파티클

### 모바일 퍼스트

- 최대 너비: 430px (루트 레이아웃)
- `env(safe-area-inset-*)` 노치 지원
- `dvh` 단위 사용 (동적 뷰포트)
- 16px 최소 폰트 (모바일 줌 방지)
- 터치 친화적 버튼 크기

---

## 보안

### 미들웨어 (middleware.ts)

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- HSTS: max-age=31536000 (preload)
- CSP: self + GA, Stripe, Toss, Supabase, Google Fonts
- API 캐시: no-store, must-revalidate

### API 보안 패턴

- **Rate Limiting**: Edge 인스턴스별 인메모리 맵 (IP/유저 키, lazy cleanup)
- **입력 검증**: Zod 스키마, UUID 검증, 문자열 길이 제한
- **출력 인코딩**: HTML 이스케이프, 마크다운 제거
- **멱등성**: 인메모리 + DB 레벨 중복 방지
- **타이밍 공격 방지**: 상수 시간 문자열 비교 (접근 게이트, 웹훅)
- **PII 보호**: 로그에서 사용자 ID 마스킹
- **CSRF**: 계정 삭제 시 확인 문자열 요구

### 인증 이중화

```
Cookie 인증 → 실패 시 → Authorization: Bearer 토큰
```

---

## 테스트

### 테스트 구성 (Vitest)

- 환경: node
- 패턴: `src/**/*.test.ts`
- Path alias: `@/` → `./src`

### 현재 테스트 (61개)

| 파일 | 테스트 수 | 내용 |
|------|----------|------|
| `story-parser.test.ts` | 36 | 3가지 파싱 전략, 엣지 케이스, cleanSceneText, 다중 인코딩 |
| `phase-detection.test.ts` | 25 | 페이즈 감지, 태그 제거, 완료 감지 |

### 테스트 명명 규칙

```typescript
describe("parseStoryScenes", () => {
  describe("Strategy 1: English section tags", () => {
    it("should parse full 10-scene story", () => { ... });
  });
});
```

---

## 과거 버그 및 해결 기록

### 이중 엔티티 인코딩 (&amp;amp;)

- **근본 원인**: `sanitizeText()`가 AI 장면 텍스트 저장 시 `&` → `&amp;` 인코딩 → DB에 이중/삼중 인코딩
- **해결**: `sanitizeSceneText()` 분리 (엔티티 인코딩 없음), 표시 시 `cleanSceneText()` 디코딩 루프, multi-level 처리

### 티켓 우회 버그

- **근본 원인**: `/?action=start` URL 핸들러가 티켓 잔여량 체크 없이 온보딩 진입
- **해결**: `startPending` 상태로 인증/티켓 로딩 대기 후 진입 허용

### zsh 브래킷 이스케이프

- `git add src/app/api/stories/[id]/route.ts` → "no matches found"
- **해결**: 경로를 따옴표로 감싸기 `git add "src/app/api/stories/[id]/route.ts"`

---

## 코딩 컨벤션

### 일반 규칙

- **"use client"** — 클라이언트 컴포넌트 상단에 반드시 명시
- **Edge Runtime** — 모든 API 라우트에 `export const runtime = "edge"`
- **한국어 UI** — 에러 메시지, 라벨, 버튼 텍스트 모두 한국어
- **break-keep** — 한국어 단어 단위 줄바꿈 (`break-keep` CSS)
- **whitespace-pre-line** — 동화 텍스트 줄바꿈 보존
- **font-light** — 보조 텍스트에 font-weight 300 사용

### 컴포넌트 패턴

```typescript
// Props 인터페이스는 컴포넌트 바로 위에 정의
interface MyComponentProps {
  required: string;
  optional?: boolean;
}

// Named export (default export 사용하지 않음)
export function MyComponent({ required, optional }: MyComponentProps) {
  // ...
}
```

### 버튼 스타일 패턴

```tsx
// 주요 CTA 버튼
<button
  className="w-full py-4 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97]"
  style={{
    background: "linear-gradient(135deg, #E07A5F, #C96B52)",
    boxShadow: "0 6px 24px rgba(224,122,95,0.3)",
  }}
>
  동작 텍스트
</button>

// 보조 링크 버튼
<button className="text-[12px] text-brown-pale underline underline-offset-2 decoration-brown-pale/30">
  보조 텍스트
</button>
```

### API 라우트 패턴

```typescript
export const runtime = "edge";

export async function POST(request: NextRequest) {
  // 1. Supabase 클라이언트 생성
  const sb = createApiSupabaseClient(request);
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  // 2. 사용자 인증
  const user = await resolveUser(sb, request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  // 3. JSON 안전 파싱
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 4. 비즈니스 로직...

  // 5. 쿠키 적용 후 응답
  return sb.applyCookies(NextResponse.json({ success: true }));
}
```

### Supabase 인증 패턴

```typescript
/** Cookie 인증 → Bearer 토큰 fallback */
async function resolveUser(sb, request: NextRequest) {
  const { data } = await sb.client.auth.getUser();
  if (data.user) return data.user;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data: tokenData } = await sb.client.auth.getUser(authHeader.slice(7));
    if (tokenData.user) return tokenData.user;
  }
  return null;
}
```

### Rate Limiting 패턴

```typescript
const rateMap = new Map<string, { count: number; reset: number }>();

function checkRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

---

## 자녀 연령별 동화 스타일

| 연령대 | 문장 길이 | 어휘 | 구조 |
|--------|----------|------|------|
| 0~2세 | 5~8단어 | 의성어/의태어 중심 | 반복적, 리듬감 |
| 3~5세 | 10~15단어 | 감각적 비유 | 기승전결, 대화 포함 |
| 6~8세 | 15~20단어 | 추상적 은유 가능 | 복합 플롯, 내면 묘사 |

---

## 시스템 프롬프트 (v2.0) 핵심 구조

1. **임상 기반**: Pennebaker 표현적 글쓰기, Michael White 내러티브 치료, 소크라테스 질문법
2. **위기 감지**: 자살/자해 키워드 → 즉시 상담 전화 안내 (1393, 1577-0199, 119)
3. **14개 은유 매핑**: 산후우울증→짙은 안개, 양육 번아웃→불 뿜는 용, 경력 단절→길 잃은 여우 등
4. **10장면 구조**: `[INTRO 1-2]` → `[CONFLICT 1-2]` → `[ATTEMPT 1-2]` → `[RESOLUTION 1-2]` → `[WISDOM 1-2]`
5. **6개 언어**: 문화별 존칭, 은유 스타일, 어조 조정
6. **최대 응답**: 600단어/회

---

## DB 마이그레이션 (9개)

```
001_initial_schema.sql    — profiles, sessions, messages, stories, feedback, subscriptions + RLS
002_community.sql         — 커뮤니티 공유
003_social.sql            — 소셜 기능 (좋아요, 댓글)
004_atomic_counters.sql   — 원자적 카운터 RPC
005_referral.sql          — 추천 프로그램
006_ticket_increment.sql  — 티켓 증감 RPC
007_sample_stories.sql    — 샘플 데이터
008_community_upgrade.sql — 커뮤니티 테이블 업그레이드
008_investor_sample.sql   — 투자자 데모 데이터
009_user_reviews.sql      — 사용자 후기 테이블
```

---

## Git 관례

- 브랜치: `main` (단일 브랜치)
- 커밋 메시지: 한국어 또는 영어, 변경 목적 중심
- zsh에서 브래킷 포함 경로는 반드시 따옴표: `git add "src/app/api/stories/[id]/route.ts"`

---

## 배포

- **플랫폼**: Cloudflare Pages
- **빌드 출력**: `standalone` (next.config.mjs)
- **자동 배포**: `main` 브랜치 push 시 자동
- **CI/CD**: GitHub Actions 없음 (Cloudflare Pages 자체 빌드)

---

## 🔴 민감 영역 (반드시 plan.md 선행)

아래 영역은 변경 시 반드시 **plan.md를 먼저 작성**하고 승인 후 구현하세요.
임의 수정 시 프로덕션 사고로 직결됩니다.

| 영역 | 파일 | 위험도 | 이유 |
|------|------|--------|------|
| **위기감지** | `src/lib/anthropic/system-prompt.ts` | 🔴 최고 | CSSRS 임상 검증된 키워드. 잘못 수정 시 자살 위기 미감지 |
| **결제** | `src/app/api/checkout/route.ts`, `webhooks/stripe/` | 🔴 최고 | 금전 직결. 티켓 차감 원자성 보장 필수 |
| **인증** | `src/lib/supabase/server-api.ts`, `middleware.ts` | 🔴 최고 | RLS 우회, 세션 탈취 가능 |
| **티켓** | `src/lib/supabase/tickets.ts` | 🟠 높음 | 원자적 차감 로직. 경쟁 조건 주의 |
| **시스템 프롬프트** | `src/lib/anthropic/phase-prompts.ts` | 🟠 높음 | 치유적 대화 품질에 직접 영향 |
| **출력 안전** | `src/lib/anthropic/output-safety.ts` | 🟠 높음 | 독성 긍정, 의료 조언 필터링 |
| **환경변수** | `.env.local` | 🔴 최고 | API 키 노출 절대 금지 |

### 수정 금지 패턴

```
❌ system-prompt.ts의 위기 키워드를 AI가 임의로 추가/삭제
❌ tickets.ts의 atomic decrement 로직 변경
❌ middleware.ts의 보안 헤더 제거
❌ .env.local을 git에 커밋
❌ RLS 정책 변경 (반드시 DBA 검토)
```

---

## 🧭 바이브코딩 워크플로우 가이드

### 기능 개발 순서

```
1. plan.md 작성 요청 ("구현하지 마. 계획만 세워줘")
2. plan.md 리뷰 & 인라인 노트 추가 (1~6회 반복)
3. 승인 후 구현 시작
4. 500줄 이상 변경 시 서브태스크로 분할
5. 구현 완료 → npm run build && npm test
6. git diff 리뷰 → 커밋
```

### 3-Attempt 모델

- **1차**: 탐색. 코드 대부분 폐기 각오. 맥락 파악용
- **2차**: 피드백 반영. 50% 활용 가능
- **3차**: 실제 작업 시작점

### 되돌리기 > 반복수정

```
AI가 잘못된 방향 → 즉시 git stash/revert → 새 접근
5분 이상 같은 버그로 씨름 → 리셋하고 처음부터
```

### 컨텍스트 관리

- 200k 토큰 중 ~20k은 CLAUDE.md + 프로젝트 초기화
- 긴 세션에서 품질 저하 시 `/clear` 후 재시작
- 검색 도구로 컨텍스트를 과다 채우지 않기 (필요한 파일만)

---

## 최근 아키텍처 추가사항 (2025.03)

### 다층 위기감지 (CSSRS 5단계)
- HIGH (Level 4-5): Claude API 바이패스, 하드코딩 위기 응답
- MEDIUM (Level 2-3): `<crisis_context>` 프롬프트 주입
- LOW (Level 1): 로그만 기록
- 14개 false positive 패턴으로 오탐 방지

### 모델 라우팅 (`model-router.ts`)
| Phase | 일반 | 유료 |
|-------|------|------|
| 1 공감 | Haiku 3.5 | Haiku 3.5 |
| 2 소크라테스 | Sonnet 4 | Sonnet 4 |
| 3 은유 | Sonnet 4 | Sonnet 4 |
| 4 동화 | Sonnet 4 | Opus 4 |

### SSE 스트리밍 (`/api/chat/stream`)
- 기존 `/api/chat` 하위호환 유지
- SSE: `{type:'meta'}` → `{type:'text'}` → `{type:'done'}`

### PWA (@serwist/next)
- 서비스워커: `src/app/sw.ts`
- 오프라인 폴백: `src/app/~offline/page.tsx`
- 매니페스트: `src/app/manifest.json`

### i18n (next-intl)
- 6개 언어: `messages/{ko,en,ja,zh,ar,fr}.json`
- 설정: `src/i18n/request.ts`
- RTL: 아랍어 자동 `dir="rtl"`

### Supabase 마이그레이션 (012-017)
```
012_llm_observability.sql   — LLM 호출 추적
013_event_logs.sql          — 이벤트 로그
014_rate_limiting.sql       — 지속적 Rate Limiting
015_response_cache.sql      — 응답 캐시
016_pgvector_foundation.sql — 벡터 검색 기반
017_crisis_tracking.sql     — 위기 이벤트 추적
```

---

## 자주 수정되는 파일

| 파일 | 변경 빈도 | 이유 |
|------|----------|------|
| `src/app/page.tsx` | 매우 높음 | 메인 SPA 플로우, 모달, 랜딩 |
| `src/components/story/StoryViewer.tsx` | 높음 | 동화 뷰어 + 공유 + 복사 |
| `src/lib/hooks/useChat.ts` | 높음 | 채팅 상태 + 임시저장 로직 |
| `src/lib/anthropic/system-prompt.ts` | 중간 | AI 프롬프트 튜닝 |
| `src/lib/utils/story-parser.ts` | 중간 | 파싱 전략 + 텍스트 정리 |
| `src/app/api/chat/route.ts` | 중간 | 채팅 API + Rate limiting |
| `src/components/chat/ChatContainer.tsx` | 중간 | 채팅 UI + 게스트 관리 |

---

## 알려진 제약사항

- Edge Runtime에서는 Node.js 전용 모듈 사용 불가 (@react-pdf/renderer는 `serverComponentsExternalPackages`로 예외 처리)
- Rate limiting: Supabase 기반 영속적 (014_rate_limiting.sql) + 인메모리 폴백
- Toss Payments는 한국 결제 전용
- 이미지 프롬프트(`imagePrompt`)는 현재 메타데이터만 저장 (실제 이미지 생성 미구현)
- PDF는 브라우저 프린트 다이얼로그 방식 (서버사이드 렌더링)

---

## 스펙 문서 (Single Source of Truth)

> Red Hat: "코드가 아니라 스펙을 수정하고, 코드는 재생성한다"

| 스펙 | 경로 | 설명 |
|------|------|------|
| Phase 시스템 | `docs/specs/phase-system.md` | 4단계 대화 엔진 전체 설계 |
| 위기감지 | `docs/specs/crisis-detection.md` | CSSRS 기반 3단계 대응 체계 |

스펙 변경 → plan.md 작성 → 승인 → 코드 구현 순서를 따릅니다.

---

## 템플릿

| 템플릿 | 경로 | 용도 |
|--------|------|------|
| plan.md | `.claude/templates/plan.md` | 기능 개발 계획서 |
| task.md | `.claude/templates/task.md` | 서브태스크 계획서 |

---

## Skills (슬래시 커맨드)

> Shankar: "Skills가 MCP보다 더 큰 거래일 수 있다"

| 커맨드 | 파일 | 용도 |
|--------|------|------|
| `/deploy` | `.claude/commands/deploy.md` | 8단계 자동 배포 (빌드→테스트→리뷰→버전→CHANGELOG→커밋→푸시) |
| `/crisis-test` | `.claude/commands/crisis-test.md` | 위기감지 회귀 테스트 |
| `/i18n-add` | `.claude/commands/i18n-add.md` | 6개 언어 번역 키 추가 |
| `/catchup` | `.claude/commands/catchup.md` | `/clear` 후 컨텍스트 복원 |
| `/review` | `.claude/commands/review.md` | 편집광 2-Pass 코드 리뷰 (CRITICAL→IMPORTANT→INFO) |
| `/simplify` | `.claude/commands/simplify.md` | 코드 간소화 |
| `/a11y-audit` | `.claude/commands/a11y-audit.md` | WCAG 2.1 AA 접근성 감사 |
| `/perf-audit` | `.claude/commands/perf-audit.md` | 번들 크기·이미지·렌더링 성능 분석 |
| `/security-check` | `.claude/commands/security-check.md` | 전체 시스템 보안 점검 (API·결제·XSS) |
| `/cleanup` | `.claude/commands/cleanup.md` | 데드코드·미사용 import·중복 로직 정리 |
| `/db-optimize` | `.claude/commands/db-optimize.md` | Supabase 쿼리·인덱스·RLS 최적화 |
| `/qa` | `.claude/commands/qa.md` | 체계적 QA (diff-aware·full·quick·regression 4모드) |
| `/plan-ceo` | `.claude/commands/plan-ceo.md` | 파운더 모드 10-star 플랜 리뷰 (gstack 기반) |
| `/plan-eng` | `.claude/commands/plan-eng.md` | 엔지니어링 매니저 모드 4-Pass 아키텍처 리뷰 (gstack 기반) |
| `/retro` | `.claude/commands/retro.md` | 주간 엔지니어링 회고 — 커밋 분석·트렌드·습관 (gstack 기반) |
| `/illust` | `.claude/commands/illust.md` | 이수지 스타일 미니멀 일러스트 프롬프트 생성 (나노바나나프로용) |
| `checklist.md` | `.claude/commands/checklist.md` | 코드 리뷰 체크리스트 (독립 참조 파일) |

---

## CI/CD

- `.github/workflows/ci.yml` — PR 시 자동: TypeScript 체크 + ESLint + 테스트 + 빌드 + 보안 검사
- Cloudflare Pages — `main` push 시 자동 배포

---

## 옵저버빌리티 & 모니터링

### LLM 호출 추적
- 모든 API 호출이 `llm_call_logs` 테이블에 자동 기록
- 비용, 토큰 사용량, 레이턴시, 캐시 히트율 추적
- 관리자 대시보드: `/admin` (ADMIN_USER_IDS 환경변수 필요)

### 위기 이벤트 추적
- HIGH/MEDIUM crisis가 `crisis_events` 테이블에 기록
- Post-crisis 모드: 5턴 동안 강화된 모니터링
- `crisis_sessions` 테이블로 세션별 위기 상태 관리

### 에러 추적
- 서버: `trackServerError()` / `trackApiError()` (error-tracker.ts)
- 클라이언트: `ErrorReporter` 컴포넌트 (window.onerror + unhandledrejection)
- 에러 리포트 API: `/api/errors/report`
