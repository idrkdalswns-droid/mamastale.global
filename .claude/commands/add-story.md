# /add-story — 신규 동화 등록

매일 DIY + 쇼케이스에 새 동화를 등록하는 운영 커맨드.
사용자가 `public/images/diy/` 와 `public/images/showcase/` 에 이미지를 올려놓으면,
이 커맨드가 제목 파악 → 영문 리네임 → 코드 등록 → 이미지 최적화 → DB INSERT SQL 생성까지 처리한다.

## 상수

```
ADMIN_USER_ID = '78dffc67-0150-4824-9799-2cad2195a81c'
AUTHOR_ALIAS  = 'mamastale'
```

## 실행 순서

### Step 1: 새 폴더 탐색
1. `public/images/diy/` 하위 폴더 목록 확인
2. `src/lib/constants/diy-stories.ts`의 기존 등록 목록과 비교
3. 새로 추가된 폴더 감지 → 사용자에게 확인
4. 폴더명 또는 showcase 이미지 파일명에서 **동화 제목** 추출
5. `.DS_Store`, `.txt`, `.mp4` 등 불필요 파일 목록 출력 → 제거 대상 확인

### Step 2: 폴더/파일 리네임
**중요**: 한글 파일명은 URL 인코딩 문제로 프로덕션에서 404 발생. 반드시 영문으로 변환.
1. 동화 제목에서 영문 kebab-case ID 생성 (예: "구두야, 엄마 데리고 가!" → "shoe-mama")
2. 폴더명이 한글이면 → `public/images/diy/{영문id}/`, `public/images/showcase/{영문id}/` 리네임
3. 폴더명이 이미 영문이면 → 그대로 사용
4. showcase 내 한글 파일명 → `cover.png`, `1.png` ~ `8.png` 순서대로 리네임
   - 숫자 없는 파일 = cover.png (1번 장면)
   - (1).png = 1.png (2번 장면), (2).png = 2.png, ...
5. DIY 파일명은 이미 `1.jpeg` ~ `9.jpeg`이므로 폴더만 리네임
6. `.DS_Store`, `.txt`, 영상 파일(.mp4, .mov) 등 불필요 파일 제거

### Step 3: 이미지 검증
1. 새 DIY 폴더에 `1.jpeg` ~ `9.jpeg` (9장) 존재 확인
2. 새 showcase 폴더에 `cover.png` + `1.png` ~ `8.png` (9개) 확인
3. 누락/초과 시 사용자에게 보고

### Step 4: 쇼케이스 이미지 최적화
1. `sips --resampleWidth 1080` 으로 리사이즈 (원본 `_backup/` 보존)
2. 최적화 전후 용량 비교 출력

### Step 5: 사용자 입력 수집
1. **동화 제목** 확인 (추출한 것 맞는지, 물음표/느낌표 등 구두점 포함 여부)
2. **DIY description** (한 줄 설명) — 사용자 직접 또는 이미지 보고 생성
3. **accent 색상** — 기존 동화와 중복 안 되게 추천. 기존 색상 목록 출력 후 제안
4. **장면별 텍스트** — showcase 이미지에 텍스트가 있으면 Read로 직접 읽어서 추출. 없으면 사용자에게 요청

### Step 6: DIY 등록
1. `src/lib/constants/diy-stories.ts` 배열 **맨 앞에** 새 항목 추가
2. `id`는 Step 2에서 생성한 영문 kebab-case
3. `makeImages("{영문id}")` 사용
4. `thumbnail`: `${BASE}/{영문id}/1.jpeg`

### Step 7: 쇼케이스 DB INSERT SQL 생성
1. `supabase/migrations/` 에 새 마이그레이션 파일 생성 (번호는 기존 최대 + 1)
2. SQL 템플릿:

```sql
-- Migration {NNN}: Add showcase story "{제목}"

INSERT INTO stories (
  user_id, title, scenes, story_type,
  illustration_urls, is_public, status, author_alias, cover_image
) VALUES (
  '78dffc67-0150-4824-9799-2cad2195a81c',
  '{제목}',
  '[
    {"sceneNumber": 1, "title": "{장면1 제목}", "text": "{장면1 텍스트}"},
    ...9장면...
  ]'::jsonb,
  'showcase',
  ARRAY[
    '/images/showcase/{영문id}/cover.png',
    '/images/showcase/{영문id}/1.png',
    '/images/showcase/{영문id}/2.png',
    '/images/showcase/{영문id}/3.png',
    '/images/showcase/{영문id}/4.png',
    '/images/showcase/{영문id}/5.png',
    '/images/showcase/{영문id}/6.png',
    '/images/showcase/{영문id}/7.png',
    '/images/showcase/{영문id}/8.png'
  ],
  true,
  'completed',
  'mamastale',
  '/images/showcase/{영문id}/cover.png'
);
```

3. SQL 전문을 사용자에게 출력 (Supabase SQL Editor에 복붙용)

### Step 8: 검증
1. `npm run build` 성공 확인
2. preview_start로 dev 서버 실행
3. `/diy` 페이지 → 새 동화 카드 존재 확인
4. `/diy/{영문id}` → 9장 이미지 정상 로드 + 제목 확인
5. 에러 로그 확인

### Step 9: 배포
1. `/deploy` 실행 (빌드 → 테스트 → 커밋 → 푸시)
2. 커밋 분리: 콘텐츠 커밋 + 버전/CHANGELOG 커밋
3. 배포 완료 후 SQL 전문 다시 출력 (Supabase 실행용)

## 주의사항

- `git add` 시 폴더 전체가 아닌 **이미지 파일만 선택적으로** 스테이징 (`.mp4`, `.mov`, `.DS_Store` 제외)
- accent 색상은 기존 동화와 겹치지 않게 선택
- 장면 텍스트 내 큰따옴표는 `\"` 이스케이프 필수 (JSON 내부)
- 마이그레이션 SQL의 `user_id`는 위 상수 ADMIN_USER_ID 사용
- 버전 범프: patch (x.x.+1)

## 참고 파일
- `src/lib/constants/diy-stories.ts` — DIY 동화 정의
- `src/app/community/[id]/CommunityStoryClient.tsx` — 쇼케이스 렌더링
- `supabase/migrations/031_showcase_stories.sql` — 쇼케이스 스키마
- `supabase/migrations/041_showcase_stone.sql` — 최신 예시 (stone 동화)
