# Changelog

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
