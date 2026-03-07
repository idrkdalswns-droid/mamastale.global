-- ============================================================
-- 011_interest_clicks.sql
-- 기능 관심 클릭 추적 (삽화/영상 수요 조사)
-- 실행: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.interest_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('illustration', 'video_story')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interest_clicks ENABLE ROW LEVEL SECURITY;

-- 누구나 삽입 가능 (게스트 포함)
CREATE POLICY "interest_clicks_insert" ON public.interest_clicks
  FOR INSERT WITH CHECK (true);

-- 조회는 service role만 가능 (관리자 대시보드용)
-- SELECT policy 없음 = anon key로는 조회 불가

CREATE INDEX idx_interest_feature ON public.interest_clicks(feature_type);
CREATE INDEX idx_interest_created ON public.interest_clicks(created_at);
