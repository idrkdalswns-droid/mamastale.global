# /perf-audit — 성능 감사

mamastale의 번들 크기, 로딩 성능, 런타임 효율을 분석합니다.

## 4단계 분석

### 1단계: 번들 크기 분석
- `npm run build` 실행하여 각 라우트별 크기 확인
- First Load JS가 130kB 초과하는 페이지 식별
- 큰 의존성 확인: `du -sh node_modules/[패키지명]`
- dynamic import 가능한 무거운 컴포넌트 식별 (Framer Motion, PDF 등)

### 2단계: 이미지 최적화
- `public/images/` 내 이미지 크기 확인
- next/image 미사용 `<img>` 태그 검색
- DIY 이미지: 원본 해상도 vs 필요 해상도 비교
- 커버 이미지(100+장): lazy loading 적용 여부

### 3단계: 렌더링 최적화
- 불필요한 리렌더링 패턴 검색:
  - 인라인 객체/배열 (`style={{}}`, `options={[]}`)
  - useEffect 의존성 누락/과잉
  - Zustand selector 미사용 (전체 스토어 구독)
- React.memo 필요한 무거운 컴포넌트 식별
- `key` prop 누락 또는 index 사용

### 4단계: 네트워크 & 캐싱
- API 호출 중복 여부 (같은 데이터 여러 번 fetch)
- Supabase 쿼리 최적화:
  - `select('*')` → 필요한 컬럼만
  - N+1 쿼리 패턴
  - 인덱스 활용 여부
- static generation 가능한 페이지 확인 (about, terms, privacy)

## 출력 형식

```
📊 성능 감사 결과
━━━━━━━━━━━━━━━━━
🔴 긴급 (즉시 수정)
  - [내용]

🟠 중요 (다음 스프린트)
  - [내용]

🟡 개선 (기회 있을 때)
  - [내용]

📈 현재 상태
  - 가장 큰 페이지: /xxx (XXX kB)
  - 총 이미지 수: XX개
  - 평균 API 응답 크기: XX kB
```
