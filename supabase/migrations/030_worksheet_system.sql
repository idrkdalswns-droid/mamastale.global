-- 030_worksheet_system.sql
-- 활동지 서비스를 위한 DB 스키마 추가
-- Phase 1-A: 감정 활동지 + 독후활동지 2종 MVP

-- 1. profiles에 활동지 티켓 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS worksheet_tickets_remaining INTEGER NOT NULL DEFAULT 0;

-- 2. worksheet_outputs (활동지 생성 기록)
CREATE TABLE IF NOT EXISTS worksheet_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id UUID REFERENCES teacher_stories(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'coloring', 'story_map', 'character_card', 'emotion', 'vocabulary',
    'what_if', 'speech_bubble', 'roleplay_script', 'post_reading'
  )),
  params JSONB NOT NULL DEFAULT '{}',
  html_content TEXT,
  structured_data JSONB,
  nuri_domains TEXT[],
  model_used TEXT,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worksheet_outputs_user ON worksheet_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_outputs_story ON worksheet_outputs(story_id);

-- 3. RPC: 원자적 활동지 티켓 차감
CREATE OR REPLACE FUNCTION consume_worksheet_ticket(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS BOOLEAN
SET search_path = ''
AS $$
DECLARE v_current INTEGER;
BEGIN
  SELECT worksheet_tickets_remaining INTO v_current
  FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;

  IF v_current IS NULL OR v_current < p_count THEN RETURN FALSE; END IF;

  UPDATE public.profiles
  SET worksheet_tickets_remaining = worksheet_tickets_remaining - p_count,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: 활동지 티켓 환불 (생성 실패 시 / 관리자용)
CREATE OR REPLACE FUNCTION refund_worksheet_ticket(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS VOID
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET worksheet_tickets_remaining = worksheet_tickets_remaining + p_count,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS (Row Level Security)
ALTER TABLE worksheet_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own worksheets"
  ON worksheet_outputs FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "users can insert own worksheets"
  ON worksheet_outputs FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
