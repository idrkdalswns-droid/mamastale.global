# /add-story — 신규 동화 등록

매일 DIY + 쇼케이스에 새 동화를 등록하는 운영 커맨드.
사용자가 `public/images/diy/` 와 `public/images/showcase/` 에 **한글 폴더명**으로 이미지를 올려놓으면,
이 커맨드가 제목 파악 → 영문 리네임 → 코드 등록 → 이미지 최적화 → DB INSERT SQL 생성까지 처리한다.

## 실행 순서

### Step 1: 새 폴더 탐색
1. `public/images/diy/` 하위 폴더 목록 확인
2. `src/lib/constants/diy-stories.ts`의 기존 등록 목록과 비교
3. 새로 추가된 한글 폴더 감지 → 사용자에게 확인
4. 한글 폴더명에서 **동화 제목** 추출 (예: "구두야, 엄마 데리고 가!" → title)

### Step 2: 한글 → 영문 폴더/파일 리네임
**중요**: 한글 파일명은 URL 인코딩 문제로 프로덕션에서 404 발생. 반드시 영문으로 변환.
1. 동화 제목에서 영문 kebab-case ID 생성 (예: "구두야, 엄마 데리고 가!" → "shoe-mama")
2. `public/images/diy/{한글폴더}/` → `public/images/diy/{영문id}/` 리네임
3. `public/images/showcase/{한글폴더}/` → `public/images/showcase/{영문id}/` 리네임
4. showcase 내 한글 파일명 → `cover.png`, `1.png` ~ `8.png` 순서대로 리네임
   - 숫자 없는 파일 = cover.png (1번 장면)
   - (1).png = 1.png (2번 장면), (2).png = 2.png, ...
5. DIY 파일명은 이미 `1.jpeg` ~ `9.jpeg`이므로 폴더만 리네임

### Step 3: 이미지 검증
1. 새 DIY 폴더에 `1.jpeg` ~ `9.jpeg` (9장) 존재 확인
2. 새 showcase 폴더에 `cover.png` + `1.png` ~ `8.png` (9개) 확인

### Step 4: 쇼케이스 이미지 최적화
1. `sips --resampleWidth 1080` 으로 리사이즈 (원본 `_backup/` 보존)
2. 최적화 전후 용량 비교 출력

### Step 5: 사용자 입력 수집
1. 동화 title 확인 (한글 폴더명에서 추출한 것 맞는지)
2. DIY description (한 줄 설명) — 사용자 직접 또는 이미지 보고 생성
3. accent 색상 (기존 동화와 중복 안 되게 추천)
4. 장면별 텍스트 (사용자가 채팅에 붙여넣기 또는 "이미지 보고 생성해줘")

### Step 6: DIY 등록
1. `src/lib/constants/diy-stories.ts` 배열 **앞에** 새 항목 추가
2. `id`는 Step 2에서 생성한 영문 kebab-case
3. `makeImages("{영문id}")` 사용
4. `thumbnail`도 영문 경로

### Step 7: 쇼케이스 DB INSERT SQL 생성
1. `supabase/migrations/` 에 새 마이그레이션 파일 생성
2. `story_type='showcase'`, `is_public=true`, `status='completed'`
3. `illustration_urls`: 영문 경로 사용 (`/images/showcase/{영문id}/cover.png`, `1.png` ~ `8.png`)
4. `cover_image`: `/images/showcase/{영문id}/cover.png`
5. `scenes` JSONB: 장면별 제목+텍스트
6. `user_id`: `'ADMIN_USER_ID'` → 사용자에게 교체 안내 (또는 이전에 사용한 ID 재사용)
7. `author_alias`: 'mamastale'

### Step 8: 검증
1. `npm run build` 성공 확인
2. 로컬 서버에서 `/diy` 페이지 → 새 동화 카드 표시
3. `/diy/{영문id}` → 9장 이미지 정상 로드

### Step 9: DB INSERT 실행 안내 + 배포
1. 사용자에게 Supabase SQL Editor에서 INSERT SQL 실행 안내
2. 실행 확인 후 `/deploy` 로 배포
3. 배포 후 `/community` 에서 "클래스 완성작" 뱃지 확인

## 참고 파일
- `src/lib/constants/diy-stories.ts` — DIY 동화 정의
- `src/app/community/[id]/CommunityStoryClient.tsx` — 쇼케이스 렌더링
- `supabase/migrations/031_showcase_stories.sql` — 쇼케이스 스키마
