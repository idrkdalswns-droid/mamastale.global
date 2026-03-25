# /add-story — 신규 동화 등록

매일 DIY + 쇼케이스에 새 동화를 등록하는 운영 커맨드.
사용자가 `public/images/diy/` 와 `public/images/showcase/` 에 이미지 폴더를 올려놓으면,
이 커맨드가 코드 등록 + 이미지 최적화 + DB INSERT SQL 생성까지 처리한다.

## 실행 순서

### Step 1: 새 폴더 탐색
1. `public/images/diy/` 하위 폴더 목록 확인
2. `src/lib/constants/diy-stories.ts`의 기존 등록 목록과 비교
3. 새로 추가된 폴더 감지 → 사용자에게 확인

### Step 2: 이미지 검증
1. 새 DIY 폴더에 `1.jpeg` ~ `9.jpeg` (9장) 존재 확인
2. 새 showcase 폴더에 이미지 파일 존재 확인
3. 이미지 순서: 숫자 없는 파일 = 1번, (1) = 2번, (2) = 3번, ...

### Step 3: 쇼케이스 이미지 최적화
1. `sips --resampleWidth 1080` 으로 리사이즈 (원본 `_backup/` 보존)
2. 최적화 전후 용량 비교 출력

### Step 4: 사용자 입력 수집
1. 동화 title (폴더명에서 추출 또는 사용자 지정)
2. DIY description (한 줄 설명)
3. accent 색상 (기존 동화와 중복 안 되게 추천)
4. 장면별 텍스트 (사용자가 채팅에 붙여넣기 또는 "이미지 보고 생성해줘")

### Step 5: DIY 등록
1. `src/lib/constants/diy-stories.ts` 배열 **앞에** 새 항목 추가
2. `id`는 영문 kebab-case (폴더명이 한글이면 영문 변환)
3. `makeImages()` 사용 가능하면 사용, 한글 폴더는 직접 경로

### Step 6: 쇼케이스 DB INSERT SQL 생성
1. `supabase/migrations/` 에 새 마이그레이션 파일 생성
2. `story_type='showcase'`, `is_public=true`, `status='completed'`
3. `illustration_urls` 배열: 이미지 순서 반영
4. `scenes` JSONB: 장면별 제목+텍스트
5. `user_id`: `'ADMIN_USER_ID_HERE'` placeholder → 사용자가 Supabase에서 교체
6. `author_alias`: 'mamastale'

### Step 7: 검증
1. `npm run build` 성공 확인
2. 로컬 서버에서 `/diy` 페이지 → 새 동화 카드 표시
3. `/diy/{id}` → 9장 이미지 정상 로드

### Step 8: 커뮤니티 "클래스 완성작" 확인 안내
1. Supabase 대시보드에서 마이그레이션 SQL 실행 안내
2. 실행 후 `/community` 에서 "클래스 완성작" 뱃지 확인

## 참고 파일
- `src/lib/constants/diy-stories.ts` — DIY 동화 정의
- `src/app/community/[id]/CommunityStoryClient.tsx` — 쇼케이스 렌더링
- `supabase/migrations/031_showcase_stories.sql` — 쇼케이스 스키마
