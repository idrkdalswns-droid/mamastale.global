-- ============================================================
-- 010_presence.sql
-- 실시간 접속자 추적 (heartbeat 기반)
-- 실행: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT NOT NULL UNIQUE,
  page TEXT NOT NULL DEFAULT 'home' CHECK (page IN ('home', 'chat', 'other')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- 누구나 카운트 조회 가능
CREATE POLICY "presence_read_all" ON public.presence
  FOR SELECT USING (true);

-- 인덱스: 활성 세션 조회 + 정리용
CREATE INDEX idx_presence_last_seen ON public.presence(last_seen);
CREATE INDEX idx_presence_page ON public.presence(page);

-- 2분 이상 비활성 세션 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM public.presence WHERE last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
