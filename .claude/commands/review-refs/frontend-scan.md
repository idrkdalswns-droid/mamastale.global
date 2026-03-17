# 프론트엔드 스캔 전략 — mamastale 전용

## 자동 스캔 명령

### 1. 접근성(a11y) 스캔
```bash
# img/Image에 alt 누락
grep -rn '<img \|<Image ' src/ --include='*.tsx' | grep -v 'alt='

# 폼 요소에 label 연결 누락
grep -rn '<input\|<select\|<textarea' src/ --include='*.tsx' | grep -v 'aria-label\|htmlFor\|id='

# 클릭 가능한 div (button 대신 div onClick)
grep -rn '<div.*onClick\|<span.*onClick' src/ --include='*.tsx'

# 색상 대비 (Tailwind 연한 텍스트 색상)
grep -rn 'text-gray-[2-4]00\|text-slate-[2-4]00' src/ --include='*.tsx'
```

### 2. 성능 패턴
```bash
# 'use client' 사용 현황 (Server Components로 가능한 것이 Client에 있는지)
grep -rn "'use client'" src/ --include='*.tsx' -l

# 큰 import (번들 영향)
grep -rn "import.*from.*'framer-motion\|import.*from.*'lodash\|import.*from.*'moment\|import.*from.*'@react-pdf'" src/ --include='*.ts' --include='*.tsx'

# next/image 대신 <img> 직접 사용
grep -rn '<img ' src/ --include='*.tsx' | grep -v 'node_modules'

# 동적 import 부재 (큰 컴포넌트가 static import)
find src/components -name '*.tsx' -size +10k -exec echo "큰 컴포넌트: {}" \;
```

### 3. 상태 관리
```bash
# useState가 과도하게 많은 컴포넌트 (5개+ = 상태 분리 필요 신호)
for f in $(find src/components -name '*.tsx' 2>/dev/null); do
  count=$(grep -c 'useState' "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 4 ]; then
    echo "⚠️ useState ${count}개: $f"
  fi
done

# useEffect 의존성 배열 누락 (무한 루프 위험)
grep -rn 'useEffect(' src/ --include='*.tsx' -A1 | grep -v '\[' | grep 'useEffect'
```

### 4. 에러 바운더리
```bash
# ErrorBoundary 사용 현황
grep -rn 'ErrorBoundary\|error\.tsx\|error\.ts' src/ --include='*.tsx' --include='*.ts' -l

# Suspense 사용 현황
grep -rn '<Suspense\|loading\.tsx' src/ --include='*.tsx' -l
```

## 심층 리뷰 필수 파일

```
□ src/app/page.tsx                              — 메인 SPA, 상태 머신, 초기 로딩
□ src/app/teacher/page.tsx                      — 선생님 모드 메인
□ src/components/chat/ChatContainer.tsx         — 핵심 채팅 UI
□ src/components/story/StoryViewer.tsx          — 동화 뷰어, 공유, 접근성
□ src/components/onboarding/OnboardingSlides.tsx — 첫 경험 (엄마)
□ src/components/teacher/TeacherOnboarding.tsx  — 첫 경험 (선생님)
□ src/components/teacher/TeacherChat.tsx        — 선생님 채팅 UI
□ src/components/teacher/TeacherPreview.tsx     — 그림책 미리보기
□ src/components/teacher/TeacherTimer.tsx       — 타이머 (만료 처리)
□ src/app/globals.css                           — CSS 변수, 다크모드
□ src/lib/hooks/useChat.ts                      — 엄마 모드 상태 관리
□ src/lib/hooks/useTeacherStore.ts              — 선생님 모드 상태 관리
```

## 접근성 심각도 판정 (mamastale 기준)

```
산후우울증 엄마가 사용하는 핵심 퍼널:
  채팅 → 동화 완성 → 동화 보기 → 결제
  이 퍼널의 WCAG 위반 → HIGH (취약 사용자 대상 서비스)

선생님 모드 핵심 퍼널:
  코드 입력 → 온보딩 → 채팅 → 미리보기 → PDF
  이 퍼널의 WCAG 위반 → HIGH

비핵심 페이지 (커뮤니티, 설정):
  WCAG 위반 → MEDIUM

장식적 이미지의 alt 누락 → LOW
```

## 성능 분석 (mamastale 기준)

```
'use client' 파일 수 / 전체 파일 수 = 클라이언트 비율
  → 60% 이상이면 Server Components 활용 부족 경고

번들 영향 체크:
  @react-pdf/renderer: 서버에서만 사용해야 번들 미포함
  framer-motion: ~40KB → 사용 빈도 대비 적절한지
  zustand: 가벼움 (~3KB) → OK

mamastale 특화:
  AI 응답 스트리밍 중 렌더링 성능 (TextDecoder + 실시간 업데이트)
  동화 뷰어의 이미지 로딩 (lazy loading 적용 여부)
  PDF 생성의 메모리 사용량 (서버 전용인지 확인)
```
