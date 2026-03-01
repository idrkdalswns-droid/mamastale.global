-- ============================================================
-- 008_community_upgrade.sql
-- 토픽 태그 + 닉네임 변경 + 댓글 신고 테이블
-- 실행: Supabase SQL Editor
-- ============================================================

-- 1. stories 테이블에 topic 컬럼 추가
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS topic TEXT;

-- 토픽 인덱스
CREATE INDEX IF NOT EXISTS idx_stories_topic ON public.stories(topic) WHERE is_public = true;

-- 2. 샘플 동화에 토픽 태그 부여
UPDATE public.stories SET topic = '산후우울' WHERE title = '비 오는 날의 무지개';
UPDATE public.stories SET topic = '양육번아웃' WHERE title = '지친 별의 쉼터';
UPDATE public.stories SET topic = '시댁갈등' WHERE title = '두 개의 정원';
UPDATE public.stories SET topic = '경력단절' WHERE title = '날개를 접은 나비';
UPDATE public.stories SET topic = '자존감' WHERE title = '거울 속 진짜 나';

-- 3. 작성자 별명을 현실적인 닉네임으로 변경
UPDATE public.stories SET author_alias = '준우맘' WHERE author_alias = '하늘빛 엄마';
UPDATE public.stories SET author_alias = '서연이네' WHERE author_alias = '민들레 엄마';
UPDATE public.stories SET author_alias = '하준맘' WHERE author_alias = '달빛 엄마';
UPDATE public.stories SET author_alias = '지우맘' WHERE author_alias = '봄날 엄마';
UPDATE public.stories SET author_alias = '시우맘' WHERE author_alias = '구름빛 엄마';

-- 4. 댓글 신고 테이블
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id UUID,
  reason TEXT DEFAULT 'inappropriate',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert" ON public.comment_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_read_own" ON public.comment_reports
  FOR SELECT USING (auth.uid() = user_id);
