-- 047_tq_sessions.sql
-- 딸깍 동화 (Twenty Questions) 세션 시스템
-- tq_sessions, tq_ticket_events, tq_events 테이블 + RPC + profiles 컬럼 추가

----------------------------------------------------------------------
-- 1. tq_sessions 테이블
----------------------------------------------------------------------
CREATE TABLE public.tq_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phase INT DEFAULT 1,
  responses JSONB DEFAULT '[]',
  generated_questions JSONB,
  q20_text TEXT,
  emotion_scores JSONB,
  primary_emotion TEXT,
  secondary_emotion TEXT,
  crisis_severity TEXT DEFAULT 'NONE',
  story_id UUID REFERENCES stories(id),
  generated_story JSONB,
  cover_status TEXT DEFAULT 'pending',
  cover_url TEXT,
  status TEXT DEFAULT 'in_progress',
  is_free_trial BOOLEAN DEFAULT FALSE,
  idempotency_key UUID,
  ticket_hold_at TIMESTAMPTZ,
  ticket_confirmed_at TIMESTAMPTZ,
  experiment_variant TEXT,
  user_rating INT CHECK (user_rating BETWEEN 1 AND 3),
  prompt_version TEXT DEFAULT 'v5',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_tq_status CHECK (status IN ('in_progress','generating','completed','failed','crisis_stopped','abandoned')),
  CONSTRAINT valid_tq_cover_status CHECK (cover_status IN ('pending','generating','completed','failed')),
  CONSTRAINT unique_tq_idempotency UNIQUE (user_id, idempotency_key)
);

-- 인덱스
CREATE INDEX idx_tq_sessions_user_id ON tq_sessions (user_id);
CREATE INDEX idx_tq_sessions_status ON tq_sessions (status) WHERE status IN ('in_progress', 'generating');

-- RLS: SELECT/INSERT만 사용자 허용, UPDATE/DELETE는 service role
ALTER TABLE tq_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tq_sessions_select_own"
  ON tq_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tq_sessions_insert_own"
  ON tq_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- 2. tq_ticket_events 테이블 (감사 로그)
----------------------------------------------------------------------
CREATE TABLE public.tq_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES tq_sessions(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('hold','confirm','refund')),
  ticket_count INT DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tq_ticket_events_session ON tq_ticket_events (session_id);

ALTER TABLE tq_ticket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tq_ticket_events_select_own"
  ON tq_ticket_events FOR SELECT USING (auth.uid() = user_id);

----------------------------------------------------------------------
-- 3. tq_events 테이블 (이벤트 트래킹)
----------------------------------------------------------------------
CREATE TABLE public.tq_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES tq_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'phase_started', 'question_answered', 'phase_completed',
    'interstitial_skipped', 'q20_started', 'q20_submitted', 'q20_skipped',
    'story_generation_started', 'story_read_completed',
    'share_clicked', 'feedback_submitted'
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tq_events_session ON tq_events (session_id);

ALTER TABLE tq_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tq_events_select_own"
  ON tq_events FOR SELECT USING (auth.uid() = user_id);

----------------------------------------------------------------------
-- 4. profiles 컬럼 추가
----------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tq_free_trial_used_at TIMESTAMPTZ;

-- 음수 방지 (이미 존재하면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_stories_remaining'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT positive_stories_remaining
      CHECK (free_stories_remaining >= 0);
  END IF;
END $$;

----------------------------------------------------------------------
-- 5. RPC: tq_hold_ticket (티켓 예약)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tq_hold_ticket(p_user_id UUID, p_session_id UUID, p_idempotency_key UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET free_stories_remaining = free_stories_remaining - 1
  WHERE id = p_user_id AND free_stories_remaining > 0;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  INSERT INTO tq_ticket_events (user_id, session_id, event_type, metadata)
  VALUES (p_user_id, p_session_id, 'hold', jsonb_build_object('idempotency_key', p_idempotency_key));
  UPDATE tq_sessions SET ticket_hold_at = NOW() WHERE id = p_session_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----------------------------------------------------------------------
-- 6. RPC: tq_confirm_ticket (티켓 확정)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tq_confirm_ticket(p_session_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM tq_sessions WHERE id = p_session_id;
  UPDATE tq_sessions SET ticket_confirmed_at = NOW(), status = 'completed' WHERE id = p_session_id;
  INSERT INTO tq_ticket_events (user_id, session_id, event_type) VALUES (v_user_id, p_session_id, 'confirm');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----------------------------------------------------------------------
-- 7. RPC: tq_refund_ticket (티켓 환불, 중복 방지)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tq_refund_ticket(p_session_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID; v_already_refunded BOOLEAN;
BEGIN
  SELECT user_id INTO v_user_id FROM tq_sessions WHERE id = p_session_id;
  SELECT EXISTS(SELECT 1 FROM tq_ticket_events WHERE session_id = p_session_id AND event_type = 'refund')
    INTO v_already_refunded;
  IF v_already_refunded THEN RETURN; END IF;
  UPDATE profiles SET free_stories_remaining = free_stories_remaining + 1 WHERE id = v_user_id;
  INSERT INTO tq_ticket_events (user_id, session_id, event_type) VALUES (v_user_id, p_session_id, 'refund');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----------------------------------------------------------------------
-- 8. RPC: tq_complete_session (동화 생성 완료 원자적 처리)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tq_complete_session(
  p_session_id UUID,
  p_generated_story JSONB,
  p_story_title TEXT,
  p_primary_emotion TEXT,
  p_secondary_emotion TEXT,
  p_emotion_scores JSONB
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_story_id UUID;
  v_is_free_trial BOOLEAN;
BEGIN
  -- 1. 세션 정보 조회 + 상태 검증
  SELECT user_id, is_free_trial INTO v_user_id, v_is_free_trial
  FROM tq_sessions WHERE id = p_session_id AND status = 'generating';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not in generating status';
  END IF;

  -- 2. stories 테이블에 동화 저장
  INSERT INTO stories (
    user_id, title, scenes, story_type, created_at
  ) VALUES (
    v_user_id,
    p_story_title,
    p_generated_story,
    'tq',
    NOW()
  ) RETURNING id INTO v_story_id;

  -- 3. tq_sessions 업데이트
  UPDATE tq_sessions SET
    generated_story = p_generated_story,
    primary_emotion = p_primary_emotion,
    secondary_emotion = p_secondary_emotion,
    emotion_scores = p_emotion_scores,
    story_id = v_story_id,
    status = 'completed',
    ticket_confirmed_at = NOW(),
    completed_at = NOW()
  WHERE id = p_session_id;

  -- 4. 티켓 confirm 이벤트 기록
  INSERT INTO tq_ticket_events (user_id, session_id, event_type)
  VALUES (v_user_id, p_session_id, 'confirm');

  RETURN v_story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----------------------------------------------------------------------
-- 9. pg_cron 예약 (주석 — Supabase Dashboard에서 수동 설정)
----------------------------------------------------------------------
-- pg_cron 활성화 후 아래 실행:
--
-- SELECT cron.schedule('tq-cleanup-generating',
--   '*/5 * * * *',
--   $$
--   UPDATE tq_sessions SET status = 'failed'
--   WHERE status = 'generating' AND created_at < NOW() - INTERVAL '5 minutes';
--   $$
-- );
--
-- SELECT cron.schedule('tq-cleanup-abandoned',
--   '0 3 * * *',
--   $$
--   UPDATE tq_sessions SET status = 'abandoned'
--   WHERE status = 'in_progress' AND created_at < NOW() - INTERVAL '7 days';
--   $$
-- );
