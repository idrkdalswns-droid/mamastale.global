-- ============================================================
-- 009_user_reviews.sql
-- 사용자 후기 테이블
-- 실행: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_alias TEXT NOT NULL,
  child_info TEXT,
  stars INTEGER DEFAULT 5 CHECK (stars >= 1 AND stars <= 5),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "user_reviews_read" ON public.user_reviews
  FOR SELECT USING (true);

-- Anyone can submit (guest reviews allowed)
CREATE POLICY "user_reviews_insert" ON public.user_reviews
  FOR INSERT WITH CHECK (true);
