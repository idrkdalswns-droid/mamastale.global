-- 044: stories 테이블 status CHECK constraint에 'deleted' 추가
-- 근본 원인: soft-delete 시 status='deleted' 설정이 CHECK 위반으로 500 에러 발생
-- 영향: DELETE /api/stories/[id] 완전 장애

-- 인라인 CHECK의 자동 생성 이름이 불확실하므로 두 가지 모두 시도
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_status_check;
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_check;

-- 새 constraint: 'deleted' 추가
ALTER TABLE public.stories ADD CONSTRAINT stories_status_check
  CHECK (status IN ('draft', 'completed', 'deleted'));
