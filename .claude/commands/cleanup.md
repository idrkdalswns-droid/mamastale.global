# /cleanup — 코드 정리 & 데드코드 제거

8+ 스프린트를 거치며 쌓인 불필요한 코드, 미사용 import, 중복 로직을 찾아 정리합니다.

## 5단계 정리

### 1단계: 미사용 Export 탐지
- 모든 `export` 된 함수/컴포넌트/타입 중 import되지 않는 것 찾기
- 검색 패턴: export 선언 → 프로젝트 전체에서 import 여부 확인
- 예외: API 라우트의 GET/POST/PATCH (Next.js가 직접 호출)

### 2단계: 미사용 Import 정리
- 각 파일의 import 중 실제 코드에서 사용하지 않는 것 찾기
- TypeScript `type` import가 런타임 import로 되어 있는 경우 → `import type` 변환

### 3단계: 중복 코드 탐지
- 동일/유사 로직이 여러 파일에 반복되는 패턴:
  - Supabase 클라이언트 생성 패턴
  - Rate limiting 로직
  - 에러 응답 포맷
  - 인증 체크 패턴
- 3회 이상 반복 → 유틸 함수 추출 제안

### 4단계: 파일 크기 분석
- 500줄 이상 파일 목록화
- 컴포넌트 분리 가능 여부 판단
- 특히 `page.tsx` (메인 SPA)의 비대화 확인

### 5단계: CSS & 스타일 정리
- Tailwind에서 사용하지 않는 커스텀 CSS 클래스
- globals.css에서 미사용 CSS 변수
- 인라인 style 중 Tailwind로 대체 가능한 것

## 실행 규칙

- 삭제 전 반드시 `npm run build && npm test` 통과 확인
- 한 번에 너무 많이 삭제하지 말 것 (파일당 또는 기능 단위)
- 삭제한 코드가 다른 곳에서 동적으로 참조되지 않는지 확인
  - `dynamic()` import
  - 문자열 기반 라우팅
  - `require()` 호출

## 출력 형식

```
🧹 코드 정리 결과
━━━━━━━━━━━━━━━━━
📁 미사용 Export: X개
📦 미사용 Import: X개
🔄 중복 코드: X곳
📏 과대 파일: X개 (500줄+)
🎨 미사용 CSS: X개

총 제거 가능: ~XXX줄
```
