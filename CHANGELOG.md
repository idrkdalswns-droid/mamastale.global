# Changelog

## [1.44.0] - 2026-03-25

### Fixed (11팀 검수 후속 — Stage 1A+1B+2 핵심)
- **결제**: 티켓 조회 실패 시 0 대신 null 유지 (불필요 결제 유도 방지)
- **결제**: Toss SDK 에러 시 하단 sticky 결제 버튼 비활성화
- **결제**: 금액 불일치 시 Slack 알림 추가 (모니터링 강화)
- **결제**: 확인 모달에 이용약관·환불 정책 링크 추가 (전자상거래법)
- **결제**: VAT 포함 명시 문구 추가
- **결제**: 가격 프레이밍 마이크로카피 ("카페 라떼 한 잔 가격")
- **결제**: 성공 페이지 자동 리다이렉트 15초→8초
- **보안**: chat/stream 게스트 UA 해시 chat/route와 동기화 (buildGuestRateLimitKey 공통 함수)
- **보안**: stories 티켓 검증 윈도우 1시간→30분 + catch 재시도 강화
- **보안**: verify-code 타이밍 공격 방어 (무효 코드에 인위 지연)
- **UX**: ErrorBoundary 랜딩 섹션별 래핑 (갤러리/DIY 크래시 시 CTA 유지)
- **UX**: SPA 화면 전환 시 포커스 자동 이동 (접근성)
- **UX**: window.confirm() 제거 (드래프트 삭제)
- **UX**: 랜딩 fade-in 1000ms→600ms
- **UX**: 워크시트 위자드 store 마운트 시 초기화
- **접근성**: chat aria-relevant="additions" (과도한 스크린리더 읽기 방지)
- **접근성**: dvh 미지원 브라우저 vh 폴백
- **성능**: Supabase preconnect 추가
- **성능**: Phase 전환 250ms→150ms
- **Teacher**: fetchSharedStories AbortController 추가
- **Teacher**: TeacherCodeModal autocomplete="off"

## [1.43.0] - 2026-03-25

### Fixed (Bug Bounty — 71건 시뮬레이션, 핵심 수정)
- **CRITICAL**: metadata JSONB 덮어쓰기 방지 — RPC 부분 업데이트로 processed_orders 소실 차단
- **CRITICAL**: initSession vs restoreDraft 세션 ID 경쟁 조건 해결
- **결제**: 가격→티켓 매핑 3곳 하드코딩을 `lib/constants/pricing.ts`로 통합 (single source of truth)
- **결제**: Toss 금액 불일치 시 사용자 불이익 방지 (Toss 확인 금액 기준 진행)
- **결제**: alreadyProcessed 응답에 ticketsAdded 포함 (워크시트 번들 오계산 수정)
- **보안**: 오픈 리다이렉트 방어 — sessionStorage 리다이렉트에 화이트리스트+URL 정규화 적용
- **보안**: 게스트 턴 제한 강화 — IP+UA 해시 복합 키로 VPN 우회 방지
- **보안**: Bearer 토큰 미포함 5개 파일 수정 (TeacherCodeModal, FeedbackWizard, CommentSection)
- **UX**: 라이브러리 커버 이미지 opacity-0 고착 해결 — 3초 안전 타임아웃 추가
- **UX**: 스토리 저장 타임아웃 시 "확인 중" 상태 + 서재 링크 표시 (storySaved 잘못 리셋 방지)
- **UX**: history pushState 축소 (8→3) — 뒤로가기 과다 누적 해결
- **UX**: popstate 핸들러 상태 유효성 검증 (빈 채팅으로 복귀 방지)
- **UX**: Sticky CTA 로그인 사용자에게도 표시
- **UX**: 터치 디바이스 감지 개선 — `matchMedia("(hover: none)")` (Surface Pro 대응)
- **UX**: 데스크톱 랜딩 여백 조정 (pt-6→pt-2, hero opacity 0.30→0.40)
- **UX**: DIY 페이지 텍스트 대비 강화 (text-brown-light→text-brown-mid)
- **AI**: SSE 스트리밍 배칭 포그라운드/백그라운드 분기 (탭 전환 시 프리즈 방지)
- **AI**: Phase 1 캐시 키에 locale 포함 + 불필요한 SHA-256 계산 Phase 1 내부로 이동
- **AI**: 위기 컨텍스트 의료 기관 안내 허용 — "병원", "응급실" crisis exception 추가
- **프론트**: StoryEditor undo stale closure 수정 (ref 기반 캡처)
- **프론트**: ChatContainer "다음" 버튼 다크모드 대응 (bg-white→bg-surface)
- **프론트**: ticketUsedForSession hydration mismatch 방지 (useEffect 초기화)
- **프론트**: 갤러리 이미지 eager 로딩 범위 확대 (6-8→5-9)

### Added
- `supabase/migrations/037_jsonb_partial_update.sql` — profiles metadata 부분 업데이트 RPC
- `supabase/migrations/038_stripe_events_dedup.sql` — Stripe 이벤트 중복 방지 테이블
- `src/lib/constants/pricing.ts` — 가격→티켓 매핑 통합 상수 (Edge Runtime 호환)

## [1.42.0] - 2026-03-25

### Added
- 신규 DIY 동화: "구두야, 엄마 데리고 가!" (9장 이미지)
- 쇼케이스 동화 DB INSERT SQL (커뮤니티 "클래스 완성작")
- `/add-story` 슬래시 커맨드 (동화 등록 자동화)
- Pull-to-Refresh 커스텀 컴포넌트 (iOS PWA 지원)
- IDOR 방지 DB CHECK 제약 마이그레이션

### Fixed
- useChat 에러 롤백: stale closure → 마지막 메시지만 제거
- retrySaveStory 미처리 Promise rejection 2곳
- 모바일 375px 레이아웃 잘림 (px-8 → px-5 sm:px-8)
- rawPreview AI 응답 노출 제거
- 프롬프트 인젝션 방어 강화 (제어 태그 블랙리스트)
- 선생님 모드 turn_count CAS + 재시도
- ReDoS 방어 (50K자 입력 가드)
- 캐릭터 추출 API 15초 타임아웃 추가
- 선생님 활동지 GET 레이트 리밋 추가

### Changed
- 쇼케이스 이미지 최적화 (70MB → 20MB, 1080px 리사이즈)
- nav.ts: 구매 링크를 PUBLIC/AUTH 모두 표시

## [1.41.0] - 2026-03-25

### Removed
- 다크모드 전면 삭제: ThemeToggle 컴포넌트, .dark CSS 변수/오버라이드, dark: Tailwind 클래스, darkMode config
- i18n(next-intl) 전면 삭제: NextIntlClientProvider, 6개 언어 메시지 파일, i18n 설정, npm 패키지
- 글로벌 론칭 시 재구현 예정

## [1.40.0] - 2026-03-25

### Changed
- SEO: JSON-LD 구조화 데이터 강화 (alternateName, HealthApplication, inLanguage)
- SEO: sitemap.xml에 /teacher 페이지 추가
- 메인 API 7개 resolveUser 공통 유틸 교체 (stories, tickets, referral, account)

## [1.39.0] - 2026-03-24

### Fixed
- ScreenState 전이 가드 추가 — 비정상 화면 전이(chat→story 직접) 차단
- myStoryCount null 레이스 — previewNotice 건너뜀 방지
- 이중 세션 만료 체크 통합 — 선생님 모드 toast/reset 중복 제거
- ErrorBoundary 미적용 확대 — OnboardingSlides, TeacherStoryWriter 래핑
- story/edit/coverPick 화면 PTR(풀투리프레시) 차단
- stories PATCH profanity 검증 추가
- TeacherStoryWriter 자동저장 interval 의존성 수정

### Changed
- tickets/use, stories POST rate limiter → persistent (Edge multi-instance 대응)
- ChatContainer 대화 기록 aria-label 동적 단계 정보 포함
- StoryViewer 폰트 크기 → useSettingsStore 통합 (localStorage 키 마이그레이션)
- 선생님 모드 TeacherChat/Preview/Writer/Worksheet dynamic import (번들 최적화)
- resolveUser 공통 유틸에 로그 namespace 파라미터 추가

## [1.38.0] - 2026-03-24

### Fixed
- 프롬프트 인젝션 방어: 사용자 입력 XML 이스케이프 처리
- 위기감지 FP 개선: "힘들어죽겠" 등 관용 표현 오탐 방지 (2단계 검증)
- 티켓 차감 경쟁조건: CAS → FOR UPDATE 행 잠금 RPC 전환
- chat/stream API Phase 통일: stream 라우트 Phase 3-4 누락 수정
- stories POST: 티켓 잔여량 사전 검증 추가

### Added
- chat-shared.ts: chat/stream 공통 로직 모듈 추출
- 033_atomic_ticket_decrement.sql: Supabase RPC 마이그레이션

## [1.37.0] - 2026-03-24

### Changed
- 선생님 모드 UI 대폭 간소화
- CTA: "새 동화 만들기" + "직접 동화 작성하기" (서브텍스트 통합)
- 서재 카드: 제목 + 날짜만 (장면 수, 작성자, 추천 태그 삭제)
- 커버이미지: child/nature/warm/animal 카테고리만 사용
- 삭제 버튼: sibling 구조 (클릭 전파 버그 수정)
- 동화 상세: 장면 넘버링 삭제, 하단 "편집" CTA 추가
- 직접 작성: 자유 형식만, 장면 제목 삭제

### Added
- TeacherStoryWriter editMode (기존 동화 PATCH 편집)

## [1.36.1] - 2026-03-24

### Fixed
- 공유 서재 GET에 deleted_at 이중 방어 필터 + source 필드 추가
- Windows 줄바꿈(\r\n) 처리 추가 (붙여넣기 자동 분할)
- localStorage 용량 초과 시 토스트 에러 표시
- 붙여넣기 textarea maxLength 100,000자 제한
- 삭제 중 카드 클릭 차단 (opacity + pointer-events)
- 추천 활동지를 fetch 시점 1회 계산 (렌더 성능 개선)
- 삭제 모달 body scroll lock + cleanup 복원
- 장면 수 카운트에서 빈 장면 제외
- 삭제 버튼 aria-busy 접근성 추가
- PATCH spreadNumber 순차 강제 할당

## [1.36.0] - 2026-03-24

### Added
- 선생님 모드: 서재 2열 비주얼 그리드 (커버이미지 3:4 비율, next/image 최적화)
- 선생님 모드: 동화 삭제 기능 (soft-delete, 확인 모달, 옵티미스틱 UI)
- 선생님 모드: 추천 활동지 태그 (키워드 기반 자동 추천, 탭→위저드 연동)
- 선생님 모드: 직접 동화 작성 기능 (TeacherStoryWriter)
  - 3종 템플릿 + 자유 형식 + 전체 붙여넣기 → 자동 분할
  - 분할 프리뷰 확인 화면
  - 탭/스크롤 전체 보기 토글
  - localStorage 30초 자동저장 + 드래프트 복구
- 타입 확장: TeacherScreenState에 WRITING 추가, TeacherStory에 source 추가

### Changed
- TeacherHome: 리스트 → 2열 그리드, 스켈레톤 로딩, 빈 상태 개선
- TeacherHome: 이모지 아이콘 → SVG 아이콘 (진행 중 대화, 온보딩)
- CTA 분리: "AI로 새 동화 만들기" + "직접 동화 작성하기"

## [1.35.0] - 2026-03-24

### Added
- 선생님 모드: 개별 동화 API (GET/PATCH/DELETE) — soft-delete 지원
- 선생님 모드: 수동 동화 생성 POST API — 직접 작성 기능 백엔드
- DB 마이그레이션: source 컬럼, deleted_at 컬럼, RLS 정책 분리 (CRUD별)
- 인라인 편집 → DB 자동 저장 (디바운스 1초)

### Changed
- TeacherPreview: SP01/SP02 레이블 → "n장"으로 변경
- TeacherPreview: 모든 이모지 → inline SVG 아이콘 교체 (6개)
- GET /api/teacher/stories: soft-delete 필터 + source/cover_image 반환 추가

## [1.34.1] - 2026-03-24

### Fixed
- 활동지 품질 개선: 서비스 광고/브랜딩 전면 제거 (아이들이 보는 자료)
- 그리기 영역 안 이모지/텍스트 제거 (그림 방해 요소)
- 그리기 영역 확대 (원형 100px, 그리기 280~350px)
- 9종 AI 활동지 base 템플릿 헤더/푸터 브랜딩 제거
- 말풍선 활동지 placeholder 텍스트 제거

## [1.34.0] - 2026-03-24

### Added
- 선생님 모드: 5p 아이들용 무료 활동지 (PDF + DOC 다운로드)
  - 동적 캐릭터 이름 추출로 동화별 맞춤 질문 생성
  - 3막 구조 연동 색상, 누리과정 영역 표시, 유료 CTA
- 선생님 모드: 2-spread 페이지네이션 (한 화면에 스프레드 2개)
- 선생님 모드: 읽어주기 가이드/누리과정 연계 accordion (탭 바 대체)

### Changed
- generate-pdf API: `type: "free-activity"` + `format: "doc"` 파라미터 추가 (기존 하위 호환)

## [1.33.1] - 2026-03-24

### Fixed
- crisis promptInjection에 `.slice(0, 800)` 길이 제한 추가 (defense-in-depth)

### Added
- 가격 페이지 히어로 섹션에 "가입하면 첫 동화 1편 무료" 배지 추가

## [1.33.0] - 2026-03-24

### Added
- 커뮤니티 "오프라인 클래스" 탭: 4주 커리큘럼 소개 (mamastale → Nano Banana Pro → CapCut → 영상 렌더링)
- 카카오톡/이메일 문의 CTA

### Changed
- 홈 CTA: 히어로↔CTA 간격 확대, 버튼 얇게, 텍스트 크기 계층 강화
- 비로그인 네비: 소개/후기/커뮤니티 (구매 제거)
- 배지: "클래스 완성작" 밝은 황금색 그라데이션
- 커버 이미지: object-top 크롭 (캐릭터 보존)
- showcase 상세: 마지막 페이지 이후 CTA 제거 → 별도 탭으로 이동

## [1.32.0] - 2026-03-24

### Added
- 완성 동화 갤러리: 커뮤니티에 삽화 포함 완성 동화 표시 (PopupBookViewer 활용)
- 커뮤니티 필터 탭: [전체] / [오프 클래스 완성작 ✨]
- StoryCard에 ✨ 완성작 배지
- 오프라인 클래스 CTA (동화 마지막 페이지 이후 카카오톡/이메일 문의)
- showcase 동화는 게스트에게도 전체 공개 (마케팅 콘텐츠)
- DB: story_type, illustration_urls 컬럼 추가

## [1.31.1] - 2026-03-24

### Added
- Pull-to-refresh 활성화 (일반 페이지에서 위로 당기면 새로고침)
- 채팅/온보딩/선생님 모드 대화 중에는 자동 차단 (대화 유실 방지)

## [1.31.0] - 2026-03-24

### Added
- 새 DIY 동화 "싱크대의 여전사" (sink-warrior) 추가

### Changed
- DIY 동화 7종 이미지를 모두 9장으로 통일 (기존 10~15장 → 9장)
- 이미지 파일명 1.jpeg~9.jpeg 표준화
- 홈 랜딩 DIY 섹션: 거대한 솜사탕 엄마 곰, 싱크대의 여전사, 잠수함 엄마 구출기 순서로 변경

## [1.30.5] - 2026-03-24

### Fixed
- 선생님 모드 활동지 위자드 단계 전환 시 스크롤이 리셋되지 않아 ConfirmStep 등 콘텐츠가 보이지 않던 문제 수정
- 활동지 위자드 프로그레스 바가 7/6처럼 총 단계 수를 초과 표시하던 문제 수정

## [1.30.3] - 2026-03-23

### Fixed
- 위기 응답 6개 언어 지원 (ko/en/ja/zh/ar/fr) — 감지 키워드 언어별 긴급 전화번호 표시
- 온보딩 역할 선택 버튼 터치 타겟 44px 미만 → min-h-[44px] 추가
- ErrorBoundary 에러 리포트 fetch 5초 타임아웃 추가
- 계정 삭제 확인 문자열 trim 미적용 수정
- ChatInput 디바운스 중 시각적 피드백 (opacity-50) 추가
- StoryViewer 잠긴 페이지 스크린리더 aria-label 개선
- ChatContainer aria-live 이중 선언 제거
- 커뮤니티 검색 LIKE 패턴 특수문자 이스케이프
- Stripe 웹훅 에러 메시지에서 DB 정보 제거
- TurnFivePopup 긴 이름 truncate 처리
- 토스트 알림 노치 safe-area-inset-top 적용
- prefers-reduced-motion 필수 애니메이션 보존
- overflow-x: hidden → clip (포커스 인디케이터 보존)
- payment/success 자동 리다이렉트 interval clearInterval 누락 수정

## [1.30.2] - 2026-03-23

### Fixed
- /api/chat 게스트 턴 영속적 제한 추가 (stream 엔드포인트와 동일한 persistent rate limit)
- sessionId Zod 검증 빈 문자열 허용 → min(1) + regex `+` 로 차단
- ChatContainer savingRef setTimeout 기반 → Promise.finally 기반 (데드락 방지)
- TurnFivePopup 첫 CTA 버튼 autoFocus 추가 (접근성)
- 선생님 코드 인증 user 단위 rate limit 추가 (IP rotation 우회 방지)
- 나머지 11개 API 라우트 인라인 rate limit Map → createInMemoryLimiter 통합

## [1.30.1] - 2026-03-23

### Refactored
- 10개 API 라우트의 인라인 rate limiting을 createInMemoryLimiter 팩토리 함수로 통합
- RATE_KEYS 상수 객체로 key prefix 중앙화 (오타 방지)
- CLAUDE.md Rate Limiting 패턴 섹션 업데이트

## [1.30.0] - 2026-03-23

### Changed
- 활동지 9종 품질 대개선 — 이모지 전면 제거, 미니멀 디자인 시스템 적용
- 베이스 CSS 3색 체계(coral/brown/gray), 인쇄 최적화(break-inside, orphans/widows)
- 캐릭터 표시: 이모지(🧒🦊👩) → CSS 이니셜 서클(등장 순서 기반 5색)
- 감정 아이콘: 이모지(😊😢😠) → 텍스트 배지 [기뻐요] [슬퍼요]
- 스토리맵: 가로 그리드 → 세로 플로우 레이아웃
- 낱말 탐험: 만3세 카드형, 만4-5세 TABLE 레이아웃 분기
- 등장인물 카드: TABLE 기반 정보 레이아웃 + 이니셜 서클
- 프롬프트: 간결함 규칙(뜻 15~20자, 예문 20~30자), 이모지 금지, 캐릭터 이름 고유명사 강제
- 스키마 max 점진적 축소: emotion_scenes 10→5, words 8→5, characters 4→3 등
- DOCX 빌더: HTML 변경사항 완전 동기화, 이모지 텍스트 전면 제거
- escapeHtml 9개 중복 제거 → worksheet-base.ts에서 공유 export

## [1.29.0] - 2026-03-23

### Added
- 선생님 모드 9종 활동지 시스템 (색칠놀이, 스토리맵, 캐릭터카드, 감정, 낱말탐험, 나라면?, 말풍선, 역할놀이, 독후활동)
- 활동지 결제 연동 (₩1,900/건, ₩7,600/5건, 론칭 할인 20%)
- 활동지 티켓 별도 관리 (worksheet_tickets_remaining)
- 첫 활동지 1건 무료 정책
- Claude Haiku 4.5/Sonnet 4.5 모델 라우팅
- 9종 HTML 렌더링 템플릿 + A4 인쇄 최적화
- 5레이어 모듈형 프롬프트 시스템 (Base+Activity+Age+Character+ContentFocus)
- Zustand 위자드 상태 관리 + Framer Motion 전환
- worksheet_outputs DB 테이블 + RLS + 원자적 티켓 차감 RPC

### Fixed
- 활동지 생성 전 티켓 잔여 사전 검증 (AI 비용 낭비 방지)
- adminClient null assertion → 안전한 null 체크
- 생성 중 beforeunload 이탈 방지
- Toss 결제 확인 시 동화/활동지 상품 타입 분기 (resolveTicketType)

## [1.28.6] - 2026-03-22

### Fixed
- 결제 성공 자동 리다이렉트 5초 → 15초 (사용자 읽기 시간)
- 다크모드 brown-pale 밝기 상향 (가독성 개선)
- 오프라인 상태에서 ChatInput 비활성화
- TurnFivePopup 키보드 접근성 (FocusTrapModal)
- 댓글 API 페이지네이션 (limit 20, page param)
- HIGH Crisis Alert → Slack webhook 자동 알림

## [1.28.5] - 2026-03-22

### Fixed
- 11팀 검수 CRITICAL 9건 수정
  - 결제 더블클릭 방지 (ref 기반 즉시 guard)
  - 온보딩 닫기 버튼 추가
  - robots.txt sitemap URL + 보호 라우트 Disallow
  - PhaseHeader ARIA role 수정 (menu → group)
  - FocusTrapModal 포커스 순서 정리
  - 빈 alt 이미지 3곳 수정
  - backdrop-filter @supports 폴백
  - 스트리밍 첫 청크 타임아웃 30s → 45s
  - stories GET 응답에서 scenes 제외 (90% 경량화)

## [1.28.4] - 2026-03-22

### Fixed
- 온보딩 스와이프 시 브라우저 뒤로가기 제스처 충돌 방지
- TypingIndicator elapsed 무한 증가 → 50초 캡핑
- 모바일 가상 키보드 올라올 때 채팅 스크롤 자동 재계산 (visualViewport API)
- ChatContainer→PhaseHeader useCallback 최적화 (불필요 리렌더링 제거)
- 색상 대비 WCAG AA 준수 (brown-pale/50 → brown-light/70, 7개 파일)
- stories POST 비속어 필터 적용 (제목 + 장면 텍스트)
- DB: 커뮤니티 쿼리 인덱스 추가 (is_public+created_at, like_count)
- DB: crisis_events.detected_keywords NOT NULL 제약
- DB: teacher_sessions FK ON DELETE RESTRICT

## [1.28.3] - 2026-03-22

### Security
- Phase 시스템 서버 신뢰: 클라이언트가 Phase 4 강제 진입 불가
- 선생님 모드 [GENERATE_READY]/[PHASE_READY] 태그 주입 방어
- crisis_sessions RLS: 사용자 자신의 위기 세션만 조회 가능 (Supabase)

### Fixed
- SSE 폴백 타임아웃 리셋 (폴백 즉시 abort 방지)
- SSE 스트림 인터벌 cleanup 보장 (리소스 누수 방지)
- 스토리 저장 실패 시 티켓 자동 롤백
- Teacher 턴 카운트 원자적 증가 (RPC + fallback)

## [1.28.2] - 2026-03-22

### Fixed
- 모바일(375px) 채팅 페이지 레이아웃 3건 수정
  - 메인 SPA에서 글로벌 footer 숨김 (입력 영역 가려짐 해결)
  - 메시지 버블 max-width 모바일 88%, 데스크탑 80%
  - PhaseHeader 텍스트 truncate + 양쪽 버튼 영역 확보

## [1.28.1] - 2026-03-21

### Changed
- 모델 라우팅 퀄리티 전략 변경: 듣는 단계 Sonnet, 만드는 단계 Opus
  - Phase 1 (공감): Haiku → Sonnet (첫인상 감정 뉘앙스 향상)
  - Phase 4 (동화): 일반 유저도 Opus 사용 (최종 산출물 품질 투자)
  - 선생님 동화 생성: Sonnet → Opus (14스프레드 문학적 완성도)

## [1.28.0] - 2026-03-21

### Added
- 선생님 모드 5-Phase 치유적 콜라보 에이전트 대개편
  - Phase A: 공감적 경청 (페니베이커 + 로저스, 교사 맥락)
  - Phase B: 브리프 수집 (핵심 메시지/캐릭터/분위기)
  - Phase C: 소크라테스 리프레이밍 + 서사 구조 설계
  - Phase D: 은유 변환 + 캐릭터 구체화 (마이클 화이트)
  - Phase E: 동화 편집장 (내부, 서재 자동 저장)
- [PHASE_READY] 태그로 AI 판단에 의한 조기 Phase 전환
- 교사 맥락 은유 매핑 테이블 (7개 주제)
- Haiku 추출 프롬프트에 Phase 구조 안내

### Changed
- MAX_TURNS 7→11, MIN_TURNS 3→5
- Phase 명칭: 마음 나누기→동화 설계→새로운 시선→캐릭터 만들기

## [1.27.2] - 2026-03-21

### Fixed
- 선생님 모드 채팅 메시지 잘림 — 하단 패딩(pb-[150px]) 추가
- 턴 카운터 미갱신 — DB 저장을 done 이벤트 전에 Promise.all await (5초 타임아웃)
- AI 반복 질문 — Phase A 필수 변수 8→3개 축소, 반복질문 금지 프롬프트 강화
- 동화 생성 요청 패턴 미매칭 — 정규식 5개로 확장

### Changed
- 턴 수 변경: MIN_TURNS 7→3, MAX_TURNS 10→7
- Phase 재조정: A(0-2턴), B(3-4턴), C(5-6턴), 7턴 자동생성
- daily_session_limit 기본값 10→3

## [1.27.1] - 2026-03-20

### Fixed
- 다크모드 `--brown-pale` 대비율 3.2:1 → 4.7:1 (WCAG AA 4.5:1 충족)
- v1.25 검수 CRITICAL C2 — 최종 수정 완료 (17/17건 완료)

## [1.27.0] - 2026-03-20

### Changed (선생님 모드 대규모 개선 — 치유적 대화 + 축하 화면)
- Phase 5단계(A-E) → 3단계(A-C)로 재조정 (A:공감경청 0-3턴, B:서사설계 4-6턴, C:세부조율 7-9턴)
- Phase 바(5단계 인디케이터) 제거 → 심플 턴 카운터 "다은 선생님과 대화 중 N/10" 헤더
- 대화 턴 최소 7턴 / 최대 10턴 고정 (7턴 미만 생성 요청 시 토스트 거부)
- 10턴 도달 시 SSE done.generateReady 플래그로 자동 동화 생성
- Phase A에 치유적 원칙 4가지 추가 (공감적 경청, 감정 반영, 내적 강점 발견, 응답 길이 2-3문장)
- forceGenerate 프롬프트 강화 (간단 확인 메시지만, 동화 내용 출력 금지)
- [GENERATE_READY] 태그 클라이언트에서 자동 제거

### Added
- CELEBRATION 화면 신규 (TeacherCelebration.tsx): 축하 이모지 + 표지 이미지 폴링 + CTA
- GENERATING → CELEBRATION → PREVIEW 3단계 플로우
- 표지 이미지 폴링 (3초 간격, 최대 30초, 타임아웃 시 표지 없이 표시)

## [1.26.0] - 2026-03-20

### Changed (내 서재 + 결제 페이지 대대적 업데이트)
- 서재: 캐러셀 → 2열 그리드 전환 (StoryCarousel 삭제, StoryGrid 신규)
- 서재: 카드에 날짜·장면수·주제 태그 메타데이터 추가
- 서재: 카드 탭 → 동화 뷰어 직접 진입 (중간 버튼 제거)
- 서재: 티켓 0장 시 구매 유도 배너 (TicketPrompt) + Promise.allSettled 병렬 호출
- 서재: is_public 동화에만 공유 버튼 표시
- 서재: 네트워크 에러 상태 WiFi-off 아이콘 + 한국어 분기
- 서재: 접근성 role="list", aria-label 추가
- 결제: "환불불가" 텍스트 → "환불 정책 보기" 링크로 교체 (전환율 최적화)
- 결제: 번들 가격비교 1줄 압축 + 동적 계산 ("1권당 ₩3,725 · ₩780 절약")
- 결제: 하단 고정바 4편 버튼 보라색 배경으로 대비 강화
- 결제: 갤러리·영상 접이식 `<details>` 전환, 후기 1개로 축소
- 결제 완료 후 추천코드 영수증 바로 아래로 이동
- GA4 결제 퍼널 이벤트 7개 추가

## [1.25.4] - 2026-03-20

### Fixed (선생님 모드 에러 핸들링 UX 개선)

- 선생님 모드 채팅 에러 메시지: "HTTP 500" 원시 텍스트 → "일시적인 오류가 발생했어요" 친화적 메시지
- 선생님 모드 채팅 "다시 시도하기" 리트라이 버튼 추가 (일반 모드와 동일 패턴)
- 선생님 모드 홈 카드 서브타이틀: 에러 메시지 필터링 → 마지막 유저 메시지 표시
- 401 세션 만료 에러 별도 안내 메시지 분기

## [1.25.3] - 2026-03-19

### Fixed (Nightwatch 야간 점검 — CRITICAL 4건 + HIGH 10건 보안 수정)

- **F-005** order_claims RLS 활성화 + 로그 테이블 INSERT 정책 닫기 (migration 028)
- **F-002** Teacher 스트리밍 3단계 타임아웃 (30s/90s/5min) — stream-timeout.ts 공유 유틸리티
- **F-003** Teacher 생성 AbortController 타임아웃 (Haiku 30s, Sonnet 120s)
- **F-004** 추천 Race Condition 방어: RPC 직접 호출로 티켓 롤백
- **F-014** 프롬프트 인젝션 방어: sanitize-chat.ts (시스템 태그 스트리핑)
- **F-015** Stripe 웹훅 메타데이터 폴백 제거 (서버 금액 매핑만 신뢰)
- **F-006~F-011** Zod 검증 6개 엔드포인트 추가 (stories, push, reviews, comments, report, referral)
- **F-009** chat/stream body size 95KB로 통일 (기존 1MB)
- **F-016** Teacher 스트림 SSE 보안 헤더 추가

### Added

- `src/lib/anthropic/stream-timeout.ts` — 스트리밍 타임아웃 공유 유틸리티
- `src/lib/utils/sanitize-chat.ts` — 프롬프트 인젝션 방어 유틸리티
- 테스트 31개 추가 (sanitize-chat 22 + stream-timeout 9), 총 311개

## [1.25.2] - 2026-03-19

### Fixed (6차 버그바운티 수정 — UX + 안정성 5건)

- **UX-3** TurnFivePopup: "사라질 수 있어요" → "안전하게 보관됩니다" (긍정적 프레이밍)
- **Y1** SW 티켓 API: 타임아웃 5s→10s, 캐시 5분→2분 (느린 모바일 stale 방지)
- **Y2** ChatInput: 전송 debounce 800ms→350ms (Android lag 개선)
- **Y3** useChat: 401/403 인증 에러 시 메시지+턴카운트 롤백 (드래프트 무결성)
- **UX-4** document.title: 채팅 중 Phase 단계 동적 표시

## [1.25.1] - 2026-03-19

### Fixed (11팀×10라운드 검수 수정 — 보안·접근성·UX 17건 중 17건 완료)

- **C1** pricing UUID 폴백: `Date.now()` → `crypto.getRandomValues()` (예측 불가능 ID)
- **C2** 다크모드 `--brown-pale` 대비율 2.8:1 → 4.7:1 (WCAG AA 충족)
- **C3** middleware 오픈 리다이렉트 방어: `//` 프로토콜 상대 URL 차단
- **C5** payments orderId: UUID v4 정규식 강제
- **C6** payments Base64: `btoa` → TextEncoder 기반 (Edge 안전)
- **H2** chat/route 캐시 키: 원본 메시지 → SHA-256 해시 (PII 제거)
- **H5** draftInfo 상대시간: 1분마다 자동 갱신 ("3분 전" → "4분 전")
- **H7** ChatContainer 3중 저장: debounce guard (500ms) 동시성 보호
- **H9** screen별 `document.title` 설정 (접근성 + 브라우저 탭 명확화)
- **H10** 채팅 메시지 영역 `aria-live="polite"` 추가 (스크린리더 지원)

## [1.25.0] - 2026-03-19

### Changed (커뮤니티 UI/UX 대대적 업데이트 — "따뜻한 수채화 갤러리" 7차 검토 APPROVE)

- **커뮤니티 레이아웃**: 단일 컬럼 16:9 → 2열 3:4 세로 카드 갤러리
- **히어로 섹션**: "엄마들의 마음이 동화가 되는 곳" 타이틀 + 검색바
- **StoryCard 재설계**: 이미지 면적 82% 확대, 미리보기 텍스트 삭제, 메타 최소화 (별명+좋아요만)
- **카드 진입 애니메이션**: Framer Motion whileInView fade-up (번들 추가 0KB)
- **페이지네이션**: 무한스크롤 → 4개/페이지 + 좌우 화살표 네비게이션
- **필터/정렬 제거**: 토픽 카테고리 필터 + 정렬 탭 삭제 (최신순 고정)
- **토픽 태그 배지 삭제**: 카드에서 주제 배지 제거
- **"내 서재" 버튼**: 이모지+배경 제거, 텍스트만
- **로그인 버튼**: coral 배경 타원 제거, 텍스트만
- **랜딩 간소화**: CTA 두 줄 삭제 + 서브텍스트 추가, 불필요 섹션 정리

## [1.24.0] - 2026-03-19

### Added (이수지 스타일 AI 표지 이미지 생성 파이프라인 — 7차 검토 APPROVE)

- **AI 표지 생성**: 동화 완성 시 Gemini 2.5 Flash로 이수지 스타일 수채화 표지 자동 생성
- **프롬프트 엔진**: Phase 4 imagePrompt 기반 이수지 화풍 프리픽스/서픽스 자동 조합
- **Supabase Storage**: illustrations 버킷에 AI 생성 표지 업로드 + public URL 반환
- **Freemium 분기**: 잠금 동화(첫 동화)는 AI 표지 skip → 기본 표지만 사용
- **cover_image 검증**: SSRF 방지를 위한 Supabase URL 엄격 정규식 검증 (isValidCoverImage)
- **fetch 타임아웃**: 동화 저장 fetch 35초 타임아웃 (AI 표지 생성 시간 포함)

### Changed

- **랜딩 CTA**: 버튼 내부에 "심리학 기반 4단계 치유 대화 엔진" 서브텍스트 추가
- **랜딩 간소화**: "이런 동화가 완성돼요" 제목, "이렇게 만들어져요" 3단계, "엄마들의 이야기가 시작되고 있어요" 삭제
- **DIY 문구**: "직접 동화 만들기" → "아이와 함께 만드는 DIY 동화"
- **대표 이야기**: "mamastale 대표 강민준의 이야기" → "mamastale 대표의 이야기" (중복 이름 정리)
- **next.config**: Supabase 이미지 remotePatterns에 pathname 추가
- **default-cover**: resolveCover()에서 https:// URL 인식

## [1.23.0] - 2026-03-19

### Changed (Phase 1 Quick Wins — E2E 시뮬레이션 피드백 반영, 8차 검토 승인)

- **랜딩 히어로**: "15분 무료 체험" 배지 + 가격 문구 삭제, "15분 AI 대화 · 10장면 동화 완성" + "심리학 기반 4단계 치유 대화 엔진" 차별점 추가
- **채팅 개인정보 보호**: 첫 대화 시작 전 "대화 내용은 암호화되어 안전하게 보호됩니다" 배너 표시
- **동화 뷰어 개선**: 폰트 최소 17px + "장면 N" 라벨 추가 + 마지막 페이지 "전체 삽화 예고" 안내
- **Pricing 평점**: 5.0 → 4.8 (신뢰성 향상), 리뷰 폼 기본값 5 → 4
- **Social proof 임계값**: communityCount > 10 → > 50 (초기 단계 허수 방지)
- **DIY CTA 경쟁 완화**: gradient 배경 → outline 스타일, "무료 DIY 동화 만들기" → "직접 동화 만들기"
- **스와이프 힌트**: 데스크톱에서 "← 옆으로 넘겨보세요 →" 숨김 (md:hidden)
- **서재 동화 수**: 헤더에 "{N}편의 동화" 동적 표시

### Fixed

- **B2B 세션 만료**: handleNewStory 호출 시 세션 만료 사전 체크 추가

## [1.22.5] - 2026-03-19

### Fixed (선생님 모드 QA — 6차 검토, 8건 수정, 3건 허위 제거)

- **세션 만료 사전 경고**: 만료 5분 전 토스트 + 만료 시 자동 코드 입력 전환
- **기존 세션 코드 불일치**: "이어서/새로 시작" 선택지 UI 추가 (다른 기관 코드 입력 시)
- **AbortError 피드백**: 네트워크 끊김 시 "연결이 끊겼어요" 메시지 표시 (사라짐 방지)
- **온보딩 뒤로가기**: 이전 선택 유지 (데이터 삭제 제거)
- **동화 파싱 실패**: 에러 응답에 AI 원본 미리보기(200자) 포함
- **공유 동화 재시도**: 네트워크 오류 시 1초 딜레이 + 2회 자동 재시도
- **모바일 온보딩**: 짧은 화면에서 "시작하기" 버튼 가려짐 방지 (max-h 조정)
- **Rate-limit 개선**: 학교 공유 WiFi 환경 대응 (user.id + IP 조합 키)

## [1.22.4] - 2026-03-19

### Fixed (6차 검토 QA — 14건 버그 수정, 8건 허위 버그 제거)

- **가격 페이지 크래시**: `next.config.mjs`에 `img.youtube.com` 호스트 추가
- **프리뷰 게이트 우회**: `storyCount` → `myStoryCount`/`communityCount` 분리 (커뮤니티 수로 덮어씌워지는 버그)
- **결제 성공 ₩0**: sessionStorage 캐시로 새로고침 시 금액 유지
- **결제 자동리디렉트**: 버튼 클릭 시 카운트다운 취소 (이중 네비게이션 방지)
- **PWA 크래시**: `PWAInstallBanner` localStorage 접근 전체 try-catch 래핑
- **커버 DB 불일치**: `patchCover()` 에러 전파 + toast 피드백
- **Library 401**: 세션 만료 시 로그인 페이지로 자동 리다이렉트
- **모달 스크롤 잠금**: PricingContent 결제 확인 모달 배경 스크롤 차단
- **댓글 더블클릭**: `submittingRef.current` disabled 반영
- **커뮤니티 끝 메시지**: 무한스크롤 끝에 "모든 동화를 불러왔어요" 표시
- **검색+필터 초기화**: 토픽 변경 시 검색어 자동 초기화
- **위기 전화 fallback**: 데스크톱에서 tel: 링크 클릭 시 번호 복사
- **오프라인 배너 이중**: ChatContainer 하단 중복 배너 제거
- **주문번호 표시**: 앞8+뒤4 형태로 개선

## [1.22.3] - 2026-03-18

### Security (11개 팀 순차 검수 — 7-Pass 리뷰 반영)
- **Stripe 웹훅 rollback 개선** — incrementTickets 실패 시 subscription DELETE → status="ticket_failed" UPDATE로 변경 (멱등성 유지, Stripe 재시도 시 ticket만 재시도)
- **DB 마이그레이션 027** — subscriptions CHECK 제약에 'ticket_failed' 추가

### Performance
- **정규식 모듈 스코프 컴파일** — AI_COMMENT_PATTERN을 매 cleanSceneText() 호출이 아닌 모듈 로드 시 1회 컴파일

## [1.22.2] - 2026-03-18

### Security (Bug Bounty 시뮬레이션 — 7-Pass 리뷰 반영)
- **Stripe 웹훅 DB 중복 방지** — 인메모리 Map 보조 + DB INSERT를 소스 오브 트루스로 전환 (Edge 격리체 재시작 안전)
- **Stripe metadata→amount 순서 변경** — 결제 금액(amount_total)을 항상 우선, metadata는 폴백만 (가격 조작 방지)
- **프롬프트 인젝션 방지** — storySeed를 `<user_input>` XML 래핑 (Anthropic 권장 패턴)
- **PDF XSS 방지** — document.write() → Blob URL 전환
- **의료 조언 필터 강화** — 공백/특수문자 정규화 후 매칭 (우회 방지)
- **요청 크기 제한** — 1MB → 95KB (Cloudflare Pages 100KB 하드 제한 정합)

### Added
- **DB 마이그레이션 026** — stripe_processed_events 테이블 (RLS) + claim_order_and_add_tickets RPC 함수
- **서비스 전체 개요 문서** — docs/mamastale-business-overview.md (하노이/다낭 사업 제안용)

## [1.22.1] - 2026-03-18

### Fixed
- **선생님 채팅 인사 반복** — 대화 중간에 "반가워요" 재출력되던 프롬프트 규칙 강화
- **선생님 온보딩 직접 입력** — 뒤로가기 후 "직접 입력" 필드 비활성화 버그 수정 (data + customTopic 리셋)
- **선생님 채팅 이중 로딩** — 빈 assistant 버블 + TypingIndicator 동시 표시 수정
- **선생님 채팅 스크롤** — min-h-0 + WebkitOverflowScrolling + smooth scroll 적용

### Changed
- **선생님 웰컴 화면 → AI 첫 메시지** — 정적 웰컴 UI를 AI 첫 채팅 메시지로 전환 (addSystemGreeting + 빠른 시작 칩 버튼 유지)

## [1.22.0] - 2026-03-18

### Added
- **[STORY_END] 마커** — 동화 본문과 AI 축하/그라운딩 텍스트를 구조적으로 분리. regex 패턴 의존 → 마커 기반 근본 해결
- **자동 제목 생성** — [TITLE: ...] 마커로 AI가 동화에 어울리는 제목 자동 생성 (기존 "나의 마음 동화" 하드코딩 대체)
- **커스텀 질문** — Phase 3→4 전환 전 배경/특별 요소 맞춤 질문 2개 (스킵 가능)
- **대사 줄바꿈** — 프롬프트 수준에서 쌍따옴표 대사 앞 줄바꿈 지시

### Changed
- **10장면 일괄 생성** — Phase 4 maxTokens 8192로 증가, 5+5 분할 대신 한 번에 출력 지시
- **extractStoryTitle()** — story-parser.ts에 제목 추출 유틸 함수 추가
- **ChatApiResponse/ChatStreamEvent** — title 필드 추가 (하위 호환)

## [1.21.2] - 2026-03-18

### Fixed
- **AI 코멘트 동화 본문 혼입** — "계속해서 완성해드릴까요", "당신의 사랑스러운 동화로 변환했습니다" 등 AI 대화성 코멘트가 동화 본문에 섞이던 크리티컬 버그 수정 (배열 기반 패턴 + 보존 테스트 4건)

### Changed
- **턴 카운터 위치 이동** — 절대위치 배지 → PhaseHeader 서브타이틀 통합 (coral+semibold 스타일)
- **TurnFivePopup 간소화** — "세상에 하나뿐인 {아이이름}를 위한 동화를 완성해보세요" 1줄로 축소
- **StoryCompleteCTA 간소화** — 토픽 칩·새 이야기·알림 팝업 제거, 축하+CTA+공유 유지
- **PremiumUpgradeCTA 리디자인** — "P" 뱃지·비교 테이블 제거, 프리미엄 차별점 bullet + ₩3,920 할인가 표시
- **선생님 접근 코드 뒤로가기** — 좌상단 "← 뒤로" 버튼 추가 (flex column + safe-area 대응)

### Removed
- **자동저장 표시** — "💾 방금 저장됨" UI 제거 (자동저장 기능 자체는 유지)
- **"↩ 원래대로" 버튼** — StoryEditor에서 제거 (resetScene 함수는 코드에 유지)

## [1.21.1] - 2026-03-18

### Added
- **Phase 1 퍼널 트래킹** — initSession()에 trackChatPhaseEnter(1) 추가, GA4 퍼널 정확도 개선
- **랜딩 하단 CTA** — 스크롤 완료 후 전환 유도 반복 CTA (스피너 + aria-busy + 가격 안내)
- **온보딩 아이콘 확대** — 4단계 플로우 아이콘 20px → 28px 시각적 인지 개선

### Changed
- **스트리밍 rAF 배칭** — per-chunk set() → requestAnimationFrame 배칭, done/safety_redirect 전 강제 flush로 레이스 컨디션 방지

### Removed
- **@react-pdf/renderer** — 미사용 의존성 제거 (55개 패키지 정리). 7-Pass 리뷰 결과 클라이언트 PDF 전환 중단 (ROI 0%, 기술 부채 증가, 기존 HTML PDF 정상 작동)

## [1.21.0] - 2026-03-18

### Added
- **가격 카드 순서 반전** — 단품(₩3,920) 먼저, 번들(₩14,900) 아래로 (R2)
- **CSS 스프링 메시지 애니메이션** — cubic-bezier 오버슈트 곡선 (I11)
- **추천 공유 배너** — 동화 마지막 페이지에 정서적 톤 추천 안내 (R1)
- **랜딩 히어로 비주얼** — "15분 무료 체험" 배지 + 대표 일러스트 카드 + AI 생성물 캡션 (C4)
- **결제 영수증 이메일** — Resend REST API fire-and-forget, 5초 타임아웃 (I12)

## [1.20.3] - 2026-03-18

### Added
- **커뮤니티 "나도 만들기" CTA** — 커뮤니티 동화 하단에 바이럴 루프 버튼 (I8)
- **FocusTrapModal 컴포넌트** — 포커스 트랩 + Escape + aria-modal 재사용 모달 (C5)
- **focus-visible 전역 스타일** — 키보드 내비게이션 아웃라인 (C5)
- **ChatInput 라이브 리전** — 로딩 상태 스크린 리더 안내 (R7)

### Changed
- **커뮤니티 좋아요 항상 표시** — ≥5 조건 제거, 0부터 ❤️ 표시 (R3)
- **다크모드 white 배경 CSS 변수화** — StoryViewer + PricingContent rgba(255,...) → rgb(var(--surface)) (R6)

### Fixed
- **커뮤니티 무한스크롤 에러** — 페이지네이션 실패 시 재시도 버튼 + page 미증가 (C2)
- **PDF 다운로드 실패** — 빈 탭 대신 에러 안내 메시지 표시 (C2)
- **환불 정책 사전 고지** — 결제 버튼 위에 "동화 생성 후에는 환불 불가" 명시 (C3)

## [1.20.2] - 2026-03-18

### Added
- **퍼널 트래킹 10개 이벤트** — onboarding_start, chat_phase_enter, story_complete, pdf_download, payment_start/complete/abandon 등 (C1)
- **trackPaymentAbandon** — 결제 실패/이탈 원인별 GA4 이벤트

### Changed
- **Phase 전환 속도 1.1s → 0.5s** — setTimeout 600+500 → 250+250, 애니메이션 0.4+0.5 → 0.2+0.25 (R4)
- **전환 중 메시지 전송 차단** — isTransitioning 가드 추가 (R4)
- **AI 첫 메시지 단축** — ~250단어 → ~60단어, 3문장으로 간결화 (R5)
- **커뮤니티 좋아요 항상 표시** — ≥5 조건 제거, 0부터 ❤️ 표시 (R3)

### Fixed
- **커뮤니티 무한스크롤 에러** — 페이지네이션 실패 시 "다시 시도" 버튼 + page 미증가 재시도 (C2)
- **PDF 다운로드 실패** — 빈 탭 대신 에러 안내 메시지 표시 (C2)

### Accessibility
- **FocusTrapModal** — 포커스 트랩 + Escape + aria-modal 재사용 컴포넌트 (C5)
- **focus-visible 전역 스타일** — 키보드 내비게이션 아웃라인 (C5)
- **ChatInput 라이브 리전** — 로딩 상태 스크린 리더 안내 (R7)

## [1.20.1] - 2026-03-18

### Fixed
- **ChatInput 연타 방지** — 800ms 타임스탬프 디바운스로 Android WebView 터치 이중 발화 차단 (Fix 1)
- **sendInFlight 영구 락** — boolean → 카운터 기반 락 + 30초 타임아웃 자동 해제 (Fix 2)
- **Stripe 통화 검증** — KRW/USD/JPY 허용 목록으로 해외 한국 어머니 결제 지원 (Fix 3)
- **빈 catch 블록 로깅** — useChat.ts 18개소에 console.warn 추가 (Fix 4)
- **MessageBubble lang** — root div에 lang="ko" 추가로 VoiceOver 한국어 발음 (Fix 5)
- **localStorage 크래시** — useSettings 프라이빗 브라우징 모드 try-catch 래핑 (Fix 20)

### Changed
- **로딩 피드백 에스컬레이션** — 5초/15초 단계별 안내 메시지 + opacity 70% 시각 피드백 (Fix 6)
- **게스트 체험 5→7턴** — 2단계 첫 AI 응답까지 무료 + GA 이벤트 추가 (UX-1)
- **위기 전화번호 가독성** — 10px→12px + opacity 향상 (UX-9)

### Added
- **useChat.ts 테스트 12개** — sendMessage 락, 동시 호출 거부, 에러 복구, phase 전환
- **ChatInput 디바운스 테스트 6개** — 800ms 윈도우 검증

## [1.20.0] - 2026-03-18

### Security
- **RLS 강화** — crisis_events, crisis_sessions 테이블을 service-role 전용 접근으로 제한
- **Push API 시크릿 분리** — SUPABASE_SERVICE_ROLE_KEY 대신 전용 PUSH_API_SECRET 사용
- **메시지 길이 제한** — 서버/클라이언트 모두 2000자 제한 (기존 50000/5000)

### Fixed
- **Stripe ₩3,920 매핑** — 20% 할인가 결제 시 티켓 미지급 수정
- **계정 삭제 정합** — HTTP 메서드 POST→DELETE, 확인 문구 한국어 통일 ("탈퇴합니다")
- **Rate limit cleanup** — 24시간 윈도우 게스트 턴이 5분 뒤 삭제되는 문제 수정 (window_seconds 컬럼 추가)

### Added
- **SSE 쿠키 전파** — chat/stream에서 getCookieHeaders()로 인증 토큰 갱신 지원
- **게스트 턴 서버 추적** — IP 기반 영속적 5턴 제한 (localStorage 우회 방지)
- **Output safety redirect** — 의료 조언 감지 시 차단 대신 전문 상담 안내 추가
- **ImageSorter 접근성** — 키보드 Enter/Space 활성화 + focus-visible 링

## [1.19.0] - 2026-03-17

### Fixed
- **선생님 모드 채팅 입력창 짤림** — GlobalNav + Footer를 /teacher 경로에서 숨김 (근본 원인: h-[100dvh] + nav 높이 충돌)
- **채팅 스크롤 오작동** — 위 Fix로 동시 해결, 플로팅 버튼 포지셔닝에 relative 추가
- **캐릭터 직접 입력 버그** — handleTextSubmit에 characterType 분기 누락 수정
- **AI 재인사 반복** — 시스템 프롬프트에 두 번째 메시지부터 인사말 반복 금지 규칙 추가
- **"사람 아이" 이미지 위치** — object-top 적용으로 얼굴이 상단에 보이도록 수정

### Changed
- **TeacherHome** — "내 동화" 탭 제거, "우리 유치원 서재"만 직접 표시 (마운트 시 즉시 fetch)
- **캐릭터 선택** — "알아서 해주세요" 옵션 제거, 그리드 아래 직접 입력 필드 추가
- **아바타 크기** — 32px → 40px (선생님 + 엄마 모드 공통)
- **TeacherOnboarding 헤더** — 우측에 홈(서재) 아이콘 버튼 추가
- **TeacherHome 헤더** — 우측에 로그아웃 버튼 추가
- `characterType` 타입을 string으로 확장 (자유 입력 허용)

## [1.18.0] - 2026-03-17

### Added
- **유치원 서재** — 같은 teacher_code 그룹의 선생님 동화 공유 열람 (SECURITY DEFINER 함수 + RLS)
- TeacherHome "내 동화" / "우리 유치원 서재" 탭 UI (레이지 페치 + 캐시)
- **아바타 일러스트** — 4단계 AI 상담사 프로필을 이수지 스타일 캐릭터 이미지로 교체 (메인 + 선생님 모드 동시 적용)
- DB 마이그레이션 024: `get_shared_session_ids()` 함수 + `shared_library_read` RLS + 성능 인덱스

## [1.17.0] - 2026-03-17

### Added
- **선생님 모드 HOME 화면** — 코드 입력 후 홈 화면 진입 (완성된 동화 목록 + 진행 중 대화 이어하기)
- "새 동화 만들기" — 기존 세션 강제 만료 + 새 세션 자동 생성 (teacherCode 재사용)
- 채팅 중 "새 메시지 ↓" 플로팅 버튼 (스크롤 위치 알림)
- 브라우저 탭 닫기 방지 (beforeunload) — 채팅 중 실수 이탈 방지

### Changed
- **CDN 캐시 불일치 해결** — HTML 문서에 `Cache-Control: no-store` 추가 (Cloudflare Pages)
- **갤러리 카드 확대** — 180px → 220px, 텍스트 10.5px → 11.5px
- **스마트 스크롤** — 선생님 모드 채팅에서 스트리밍 중 이전 대화 읽기 가능
- **로딩 인디케이터 교체** — 인라인 3-dot → TypingIndicator (프로그레시브 힌트)
- PATCH API 확장 — currentPhase, expiresAt(과거만) 선택적 업데이트 지원
- 채팅 나가기 → HOME 복귀 (기존: 메인 페이지 이동)

## [1.16.0] - 2026-03-17

### Added
- **Freemium 잠금 모델 v2** — "Try Before You Buy" 수익화 메커니즘
  - 첫 동화 무료 완성 (턴 게이트 면제, 30턴 상한)
  - 완성 직후 전체 1회 미리보기 (PDF/공유/편집 비활성)
  - 서재에서 6/10 장면만 공개 (해결+교훈 장면 잠금)
  - 잠긴 페이지 블러 + 따뜻한 CTA 카드 ("이 순간을 간직하기")
  - 결제 시 자동 잠금 해제 (auto-unlock)
  - 온보딩 "첫 동화 무료" 안내 문구
  - GA 전환 이벤트 3개 (lock_cta_click, preview_complete, unlock_success)
- DB 마이그레이션: `is_unlocked` 컬럼 (023_revenue_model_v2.sql)
- 인증 유저 30턴 상한 (AUTH_TURN_LIMIT)
- 잠긴 동화 커뮤니티 공개 차단 (서버사이드)
- 결제 성공 페이지 서재 CTA + 잠금 해제 안내

### Changed
- 신규 유저 무료 티켓: 1장 → 0장
- 결제 성공 후 자동 리디렉트: 홈 → 서재

## [1.15.4] - 2026-03-17

### Changed
- 랜딩 페이지 갤러리 복구 — "이런 동화가 완성돼요" 10장면 스크롤러
- 서비스 소개 링크를 부제 우측으로 이동 (하단 → 상단)
- "이렇게 만들어져요" 일러스트 아이콘 확대 (24px → 44px + scale-[2]) — 삽화 가시성 개선
- 다크모드 토글 버튼 간소화 — 회색 원형 배경 제거

## [1.15.3] - 2026-03-17

### Changed
- 선생님 모드 온보딩 카드 프레임 축소 (max-h-[140px]) — 모바일에서 라벨 잘림 해결
- 온보딩 일러스트 이미지 확대 (scale-[1.5]) — 여백 크롭하여 캐릭터 강조
- 선생님 채팅 화면에 뒤로가기 버튼 + 저장 확인 다이얼로그 추가
- 선생님 온보딩 화면에 홈 버튼 추가

## [1.15.2] - 2026-03-17

### Removed
- 데드 컴포넌트 12개 삭제 (Library 3D, Bookshelf, AdBanner, SignupModal, SceneCard, TicketConfirmModal, PDF generator)
- 데드 API 라우트 삭제 (Stripe checkout — Toss 전환 후 잔재)
- 미사용 import 4건 제거 (getClientIP, createClient, trackPdfDownload, hapticSuccess)
- 미사용 export 함수 9건 제거 (analytics 5, error-tracker 2, haptic 1, story-parser 1)

## [1.15.1] - 2026-03-17

### Changed
- 랜딩 페이지 간소화 — 부제/갤러리/선생님 CTA/추천 섹션 삭제
- 상단 네비게이션 변경 — 서재→선생님 모드, 커뮤니티 페이지에 서재 링크 추가
- 파운더 소개 제목 변경 — "만든 사람의 이야기" → "mamastale 대표 강민준의 이야기"

### Removed
- GalleryScroller 컴포넌트 (데드코드 정리)
- ReferralCard 랜딩 노출 제거
- DIY 설명 텍스트 및 "6개 동화 모두 보기" 링크

## [1.15.0] - 2026-03-17

### Added
- 선생님 모드 웰컴 메시지 개인화 — 온보딩 주제/연령 반영 + 클릭형 프롬프트 칩
- 그림책 창작 파이프라인 7개 에이전트 스킬 (pb-orchestrator~pb-dev-reviewer)

### Changed
- 선생님 온보딩 카드 48px→풀카드 이미지 (캐릭터 선명하게 보이도록)
- PhaseIndicator 원 28→36px, 이미지 fill 모드, 연결선 확대
- Preview 탭/PDF 아이콘 16→20px
- 메인 서비스 이모지(🫧🌿✨📖💬) → 일러스트 이미지로 교체 (OnboardingSlides, 랜딩, StoryCompleteCTA)
- 선생님 채팅 타이머 제거 + 만료 감지 인라인 (useRef 안정화)

### Removed
- TeacherTimer.tsx 컴포넌트 삭제 (로직은 TeacherChat에 인라인)

## [1.14.1] - 2026-03-17

### Fixed
- 선생님 모드 코드 리뷰 18건 수정 (보안 3-레이어 인젝션 방어, 데이터 무결성, 클라이언트 안정성, UX)

### Changed
- 선생님 모드 전체 이모지(62개) → 이수지 스타일 미니멀 일러스트(38개)로 교체
- illust.md 프롬프트 에이전트 v2 재작성 (5-블록 구조, 배치 모드, 시그니엘 엄마 기준)

## [1.14.0] - 2026-03-16

### Added
- 선생님 모드 (Teacher Mode) — 유치원/어린이집 교사용 맞춤 동화 생성 기능
- 접근 코드 인증 + 3시간 세션 관리 (teacher_sessions)
- 5단계 Phase 대화 엔진 (A~E) — 브리프 수집 → 서사 탐색 → 캐릭터 설계 → 세부 조율 → 생성
- Haiku 구조 추출 + Sonnet 4 14스프레드 동화 생성 (max_tokens=8192)
- 누리과정 59개 내용 자동 매핑, 연령별 하드 가드레일, 발달 적합성 검수
- 활동지 PDF (16p A4) + 읽기 가이드 PDF (4p A4) 다운로드
- 5단계 온보딩 (연령대/맥락/주제/캐릭터/상황)
- 14스프레드 미리보기 + 인라인 편집 + 탭 UI (동화/가이드/누리/삽화/검수)
- 세션 복구 (새로고침 시 대화 히스토리 + Phase 자동 복원)
- 킬 스위치 (NEXT_PUBLIC_TEACHER_MODE_ENABLED)
- resolveUser() 공통 인증 유틸 추출

## [1.13.0] - 2026-03-16

### Fixed
- cleanSceneText null/undefined 방어 — DB JSONB 유입 시 크래시 방지 (D1)
- AI 메타 코멘트 제거 — [TAGS:...], [Image Prompt:...], 축하합니다 계열, 메타 해설 자동 제거 (C2)
- 새 이야기 시작 시 옛 Draft 카드 잔류 수정 — clearDraft() 호출 추가 (H3)
- HIGH crisis 응답 SSE 변환 — 이중 API 호출 및 이중 로깅 제거 (C5)
- order_claims DELETE 롤백 → status 플래그 — 결제 실패 시 재시도 불가 문제 해결 (S7)

### Changed
- ChatStreamEvent에 isCrisisIntervention, medicalBlocked 타입 추가 (D2)

## [1.12.0] - 2026-03-16

### Fixed
- 결제 안정성: CAS 재시도 3→5회 + jitter 백오프, RPC 에러 분류, 멀티 isolate order_claims 경합 방어
- 서버 방어: Phase 조기 전환 차단 (minTurns 미달 시 strip), 축하합니다 단독 false positive 제거
- 의료 조언 차단: output-safety 로그 전용 → 실제 차단으로 전환
- 스트리밍 안정성: 초기 30s 타임아웃, finalMessage 5s 타임아웃, atomic close, request.signal 연결
- 크래시 방지: saveInFlight 30초 타임아웃 시 storySaved 리셋, handleRetry 최신 state 사용
- 모바일 안정성: beforeunload → pagehide 전환 (iOS Safari 대응)
- 동시전송 방지: sendMessage module-level lock 추가
- StoryEditor 빈 장면 검증, PopupBookViewer 빈 배열 가드

### Changed
- 무료 대화 3회 → 5회 확대 (클라이언트 + 서버 동기화)
- 주제 추천 긍정 키워드로 변경 (나의 꿈, 가족 사랑, 용기와 모험 등)
- TurnFivePopup 긴급감 카피 + 게스트 loss aversion 문구 추가
- 새 이야기 버튼 coral gradient CTA로 강화

## [1.11.1] - 2026-03-16

### Fixed
- 인앱 브라우저(카카오톡 등) 로그인 UX 개선: 페이지 진입 시 즉시 감지 + Google 버튼 숨김
- "외부 브라우저로 열기" 버튼 추가 (카카오톡/라인/Android 인앱에서 1탭 전환)
- 앱별 구체적 안내 메시지 ("카카오톡에서는...", "인스타그램에서는...")

### Changed
- Claude 스킬 업데이트 (plan-ceo, plan-eng, qa, retro, review, checklist → gstack 최신 반영)
- `/ship` 스킬 신규 추가 (자동 머지→테스트→리뷰→버전→배포 파이프라인)

## [1.11.0] - 2026-03-16

### Fixed
- 추천 코드 시스템 완전 수리: anon client → service role (RLS INSERT 차단 해결)
- 추천 코드 부분 실패 시 rollback 추가 (UNIQUE 제약 잠금 방지, 재시도 가능)
- 결제 전 채팅 이중 저장 (persistToStorage + saveDraft) — 결제 리다이렉트 시 유실 방지

### Added
- OAuth 로그인 후 자동 추천 코드 claim (implicit/PKCE/fallback 3경로 대응)
- 설정 페이지에 수동 추천 코드 입력 UI (toast 피드백 포함)
- 추천 링크 방문 시 환영 토스트 ("가입하면 무료 티켓을 드려요 🎁")
- Pricing 소셜 프루프 동적화 (하드코딩 127 → /api/community 실시간 조회)

## [1.10.0] - 2026-03-16

### Fixed
- SSE 스트림 controller 이중 close 크래시 방지 (closed flag)
- useChat saveInFlightTimer 레이스 컨디션 (clearTimeout 추가)
- ChatInput sendingRef 500ms 하드코딩 → isLoading 연동
- saveDraft 예외 미처리 (private browsing localStorage 비활성 대응)
- GUEST_TURN_LIMIT 서버 불일치 (5→3 통일)
- PhaseTransition 잘못된 phase 값 null 체크

### Added
- 랜딩 CTA "무료로 체험하기" + 모바일 하단 sticky CTA (IntersectionObserver)
- 게스트 턴 카운터 프로그레스 바 ("무료 대화 2/3")
- 오프라인 감지 배너 ("인터넷 연결이 끊겼어요")
- 실시간 동화 카운터 (소셜 프루프, 10편 이상 시 표시)
- StoryCompleteCTA 공유 URL에 storyId 포함 (바이럴 루프 복원)
- 설정 페이지 (/settings): 프로필, 추천코드, 데이터 내보내기, 계정 삭제
- OAuth 로그인 후 redirect 복원 (sessionStorage)
- GA4 sign_up 이벤트 추가
- `/api/referral` POST rate limiting (5/min per IP)
- `/api/push/send` rate limiting (100/min) + constant-time API key 비교
- 깨진 이미지 fallback (StoryCard, StoryGallery3D)
- TurnFivePopup Escape 키 닫기
- 온보딩 이름 입력 한글/영문/숫자 검증
- 글로벌 ErrorBoundary (root layout)

### Changed
- SEO 타이틀: "mamastale — AI로 만드는 나만의 동화"
- keywords 추가: AI 동화, AI 동화 만들기, 아이 동화 만들기
- 이미지 최적화 활성화 (unoptimized: true 제거)
- turnCountInCurrentPhase 상한 .max(50) 추가

## [1.9.2] - 2026-03-15

### Changed
- 온보딩 연령 카드: 흰색 바 오버레이 제거, 라벨을 이미지 하단 외부로 분리 (나눔명조 세리프)
- 9~13세 이미지 object-position 조정 (1:1 크롭 시 캐릭터 잘림 방지)

### Added
- `/illust` 스킬: 이수지 스타일 미니멀 일러스트 프롬프트 생성 에이전트 (나노바나나프로용)
- 커버 이미지 12개 추가

## [1.9.1] - 2026-03-15

### Changed
- 온보딩 연령 카드: 이모지(👶🧒👦👧) → 이수지 스타일 미니멀 일러스트 이미지로 교체
- 커버 이미지 18개 추가 (child/warm/nature 카테고리)

## [1.9.0] - 2026-03-15

### Changed
- 온보딩 전면 리디자인: 5슬라이드 → 단일 화면 (대화시작률 개선)
- 연령 선택 2×2 대형 카드 + 마이크로 피드백 (선택 시 연령별 설명 표시)
- parentRole 기본값 "엄마" + 축소형 "다른 보호자이신가요?" 링크
- 위기 상담 안내 최소형 1줄로 축소

### Added
- 아이 이름 입력 (선택사항) + 한글 조사 유틸리티 (`korean.ts`)
- 아이 이름 개인화: CTA 버튼, 첫 AI 인사, 페이월, 완성 축하, 공유 텍스트
- 4단계 흐름 아이콘 (대화→발견→은유→동화) + 시간 약속 "약 15분이면 충분해요"
- 후기 1줄 ("아이가 매일 읽어달라고 해요" — 준우맘)

## [1.8.1] - 2026-03-15

### Added
- 인앱 브라우저 감지 유틸리티 (`browser-detect.ts`) — 카카오톡, 네이버, 인스타그램 등 7종
- Google OAuth 인앱 브라우저 사전 차단 + "링크 복사하기" 안내 UI
- 콜백 페이지: `disallowed_useragent` 에러 시 친절한 안내 메시지

### Fixed
- CSP 헤더에 `accounts.google.com`, `oauth2.googleapis.com` 누락 수정
- OAuthButtons 에러 메시지 줄바꿈(`\n`) 미표시 수정 (`whitespace-pre-line`)
- OAuth 버튼 로딩 타임아웃 5초 → 15초 (느린 네트워크 대응)

## [1.8.0] - 2026-03-15

### Added
- DIY 사용 안내 페이지 (`/diy/guide`) — 목적·취지·3단계 사용법·CTA
- 홈페이지 "무료 DIY 동화 만들기" → 안내 페이지로 연결

### Changed
- ImageSorter: 2열 → 3열 그리드 레이아웃 (이미지 순서 정하기 화면)
- ImageSorter: motion.button → motion.div (button-in-button 하이드레이션 경고 수정)
- DIY 갤러리: "무료 서비스" 배지 → "사용 안내 →" 링크

## [1.7.0] - 2026-03-15

### Fixed
- PopupBookViewer: 페이지 밀림 버그 수정 — Framer Motion drag → pointer event 기반 스와이프
- DIYComplete: 완성 동화 표시 안 되던 버그 수정 — min-h-dvh → h-dvh overflow-hidden
- 서재/커뮤니티에서 DIY 동화 이미지 표시 안 되던 버그 수정

### Added
- ImageSorter: 이미지 삭제 기능 (× 버튼) + 삭제된 이미지 복원 UI
- useDIY: deleteImage/restoreImage 액션, initStory 검증 완화 (삭제된 이미지 허용)
- 서재 상세: DIY 동화 → PopupBookViewer 읽기 모드 + 커뮤니티 공유 폼
- 커뮤니티 상세: DIY 동화 → PopupBookViewer 읽기 모드 조건부 렌더링
- API: stories/community GET 응답에 source 필드 추가 (metadata에서 추출)

### Changed
- 홈페이지: CTA 버튼 1개로 통합 ("내 동화 만들기"), 중복 CTA 삭제
- 홈페이지: "무료 DIY 동화" 섹션을 "이렇게 만들어져요" 위로 이동

## [1.6.0] - 2026-03-15

### Changed
- DIY ImageSorter: 드래그 리스트 → 2열 그리드 tap-to-swap (스크롤 충돌 해결, 이미지 크기 대폭 확대)
- DIY PopupBookViewer: 1:1 컨테이너 → flex 기반 9:16 + object-contain (일러스트 크롭 해결)
- DIY PopupBookViewer: 페이지 dots → 하단 썸네일 스트립 (스크롤 네비게이션)
- DIY 상태관리: step/currentPage/savedStoryId localStorage 저장 (새로고침 복원)
- DIY 상태관리: setText 디바운싱 500ms + step/page 전환 시 flush

### Added
- PopupBookViewer: 글자수 카운터 (0/200)
- PopupBookViewer: visualViewport 키보드 대응 (scrollIntoView)
- PopupBookViewer: 인접 이미지 prefetch
- POST /api/stories: cover_image 저장 + regex 화이트리스트 검증
- DIYComplete: 저장 에러 재시도 버튼
- DIYComplete: 로그인 시 sessionStorage 복귀 경로 저장

### Fixed
- DIY 편집 후 돌아와도 "서재에 저장됨" 표시되던 버그 (savedStoryId stale)
- 라이브러리에서 DIY 동화 썸네일 미표시 (coverImage POST 누락)

## [1.5.0] - 2026-03-15

### Added
- SectionTabBar 컴포넌트 — IntersectionObserver 기반 섹션 퀵점프 탭 바
- 홈페이지 CTA 1차 — Title 직후 ~150px에 즉시 노출
- 홈페이지 CTA 2차 — 후기 섹션 직후 전환 포인트

### Changed
- 홈페이지 레이아웃 재정렬 — 전환율 최적화 순서 (CTA→갤러리→방법→후기→DIY)
- 구매 페이지 레이아웃 재정렬 — 가격 카드 최상단 이동 (요금→후기→갤러리→체험→FAQ)
- 구매 페이지 SectionTabBar 추가 (stickyTop="top-12", scrollOffset=82)

### Removed
- 홈페이지 환영 메시지 ("○○님 환영합니다") — 탭 바로 대체
- 홈페이지 실시간 인원 표시 (usePresence) — 전환 기여 낮음
- 홈페이지 4일 연속 대화 프로그램 섹션 — 정보 과부하
- 홈페이지 Value proposition 중복 텍스트
- 구매 페이지 이메일 구독 폼 — 전환 흐름 차단
- 구매 페이지 공유 버튼 섹션 — 구매 페이지에서 불필요

## [1.4.0] - 2026-03-15

### Added
- 고객 지원 채널 — GlobalNav 카카오톡 아이콘 + Footer 고객센터 섹션 (카카오 오픈채팅 + 이메일)
- 결제 후 자동 시작 — 결제 성공 시 5초 카운트다운 후 동화 만들기 자동 이동
- 스토리 에디터 Undo — 최대 20단계 되돌리기 + Ctrl/Cmd+Z 단축키 + 3초 디바운스
- 동화 완성 축하 효과 — CSS confetti 폭죽(40조각) + 📖 스프링 애니메이션 + 햅틱 피드백
- 추천 코드 공유 — 동화 공유 시 referral code URL 자동 포함 (카카오/Web Share/클립보드)
- 채팅 전체 진행률 — PhaseHeader에 진행률 % + 예상 잔여 시간 표시
- 네트워크 에러 복구 — 오프라인 배너 + 자동 저장 타임스탬프 표시

### Changed
- 온보딩 슬라이드 — 임상 용어 제거, 일상 언어로 페르소나 소개 변경
- 동화 완성 CTA — 제목에 "축하합니다!" 추가 + scale 스프링 애니메이션 강화

### Fixed
- StoryCompleteCTA 유니코드 마이너스 문자(−) → ASCII 하이픈(-) 수정 (빌드 에러)

## [1.3.1] - 2026-03-15

### Added
- 갤러리 dot 인디케이터 — IntersectionObserver 기반 10장면 위치 표시 (#26)
- 스티키 CTA에 상품 컨텍스트 한 줄 추가 (#20)
- 펜네베이커 연구 출처 링크 (#31)
- 소셜 공유 버튼 — Web Share API + 링크 복사 (#29)
- 이메일 구독 폼 — FAQ 섹션 위 경량 캡처 (#24)
- 라이프스타일 이미지 슬롯 준비 (#30)

### Changed
- 갤러리 오버레이 불투명도 강화 — 텍스트 가독성 개선 (#25)
- 하드코딩 hex 색상 → CSS 변수/Tailwind 토큰 전환 (#27)
- 클레이모피즘 카드 그림자 → 미니멀 단순화 (#19)
- YouTube iframe에 loading="lazy" 추가 (#22)

## [1.3.0] - 2026-03-14

### Changed
- 구매 페이지 14-페르소나 시뮬레이션 QA 35건 반영
- 전자상거래법 필수 표시 추가 (사업자등록번호, 대표, 소재지, 통신판매업)
- 소셜 프루프 리뷰 평점 수학적 불일치 수정 (4.8→5.0)
- 첫 구매 할인 비로그인 사용자에게도 노출
- "24% OFF" 기만적 프레이밍 → "1권당 ₩1,175 절약" 정직한 표시
- 무료 체험 CTA 추가 (PLG 전환 개선)
- 확인 모달 취소 텍스트 중립화 ("다시 생각해볼게요"→"취소")
- 서버/클라이언트 컴포넌트 분리 (SSR SEO 개선)
- WCAG AA 접근성 개선 (최소 11px, aria-label, 포커스 트랩, role=alert)
- YouTube 영상 썸네일 포스터 이미지 추가
- FAQ 아코디언 높이 트랜지션 애니메이션 (300ms)
- "준비 중인 기능" 섹션 제거 (구매 지연 방지)
- "왜 1회 구매?" → "이런 분에게 딱이에요" 긍정 프레이밍
- 소셜 프루프 카운터 + 갤러리 후 소프트 CTA 추가
- 추천인 프로그램 티저 추가
- 줌 클래스 언급 제거 (브랜드 혼란 방지)
- 환불 안내 문구 중복 축소 (모달 1회만)

## [1.2.0] - 2026-03-14

### Changed
- DIY 동화 에디터 20건 QA 피드백 반영 (14-페르소나 시뮬레이션 기반)
- 3단계 스테퍼 UI 추가 (순서→이야기→완성 진행 표시)
- 텍스트 미작성 시 완성 가드 + 진행률 표시
- 모바일 네비게이션 반응형 개선 (작은 뷰포트 깨짐 방지)
- 다크모드 갤러리 카드 밝기 보정
- 페이지 dots 슬라이딩 윈도우 (13페이지 이상 대응)
- 키보드 ← → 페이지 네비게이션 지원
- 드래그 힌트 시인성 강화 + bounce 애니메이션
- DIY 에디터 SEO 메타데이터 (서버/클라이언트 컴포넌트 분리)
- 접근성: aria-label, alt 텍스트 개선
- localStorage 만료 정책 (30일/3개 제한)
- CTA 링크 수정, onTouchEnd 누락 수정, dragDirectionLock 추가
- eager 로딩 범위 축소 (4→2), 리셋 버튼 confirm 추가

## [1.1.0] - 2026-03-14

### Changed
- 홈페이지 랜딩 정리: 중복 섹션 제거 (후기 캐러셀, 3버튼 그리드, 티켓 잔여량)
- DIY 동화 진입점 CTA 추가 (홈페이지 → /diy)
- DIY 썸네일 이미지 경로를 diy-stories.ts 단일 소스로 통합
- 용어 표준화: "나만의 동화" → "맞춤 동화", "동화책" → "동화"
- GlobalNav 조건부 렌더링 (로그인 상태별 메뉴 차별화)
- 추천인 카드 노출 조건 개선 (비로그인 + 특정 페이지에서만)
- SEO 메타데이터 보강 (Open Graph, 설명문 업데이트)

### Fixed
- DIY 동화 썸네일 이미지 누락 (하드코딩된 잘못된 파일명 → 실제 경로로 수정)
