# /db-optimize — Supabase DB 최적화

mamastale의 Supabase 쿼리, 인덱스, RLS 정책을 분석하고 최적화합니다.

## 4단계 분석

### 1단계: 쿼리 패턴 분석
모든 API 라우트에서 Supabase 쿼리를 추출하고 검사:
- `select('*')` → 필요 컬럼만 선택하도록 변경
- `.order()` 없는 목록 조회 → 정렬 기준 추가
- `.limit()` 없는 대량 조회 → 페이지네이션 추가
- 조인(`.select('*, profiles(*)')`)의 효율성

### 2단계: N+1 쿼리 탐지
- 루프 안에서 DB 호출하는 패턴 찾기
- 예: 댓글 목록 조회 후 각 댓글의 사용자 정보를 개별 조회
- 해결: `.select('*, profiles(display_name)')` 조인으로 변환

### 3단계: 인덱스 최적화 제안
현재 마이그레이션 파일 분석 후 누락된 인덱스 제안:
- `WHERE` 절에 자주 사용되는 컬럼
- `ORDER BY` 대상 컬럼
- 외래 키 컬럼
- 복합 인덱스 필요 여부

```sql
-- 예시: 커뮤니티 목록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_stories_public_created
ON stories(is_public, created_at DESC)
WHERE is_public = true;
```

### 4단계: RLS 성능
- RLS 정책이 인덱스를 활용하는지 확인
- `auth.uid()` 비교가 인덱스 컬럼과 매칭되는지
- 복잡한 RLS 정책이 쿼리 성능에 미치는 영향 분석

## 출력 형식

```
🗄️ DB 최적화 분석
━━━━━━━━━━━━━━━━━
📊 분석된 쿼리: XX개
🔴 N+1 쿼리: X곳
🟠 과도한 SELECT: X곳
🟡 인덱스 제안: X개
✅ RLS 정책: 양호/개선필요

권장 마이그레이션:
[SQL 코드 제안]
```

## 주의사항
- 인덱스 추가는 쓰기 성능에 영향 → 읽기 빈도가 높은 테이블만
- RLS 변경은 민감 영역 → plan.md 선행 필수
- 마이그레이션 SQL은 `supabase/migrations/` 규칙 준수
