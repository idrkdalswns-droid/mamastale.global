-- ============================================================
-- Migration 017: Crisis Tracking & Post-Crisis Mode
-- CSSRS-inspired crisis event tracking for post-crisis protocols
-- ============================================================

-- Track individual crisis events per session
CREATE TABLE IF NOT EXISTS public.crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
  cssrs_level INTEGER CHECK (cssrs_level BETWEEN 1 AND 5),
  detected_keywords TEXT[] DEFAULT '{}',
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crisis_events ENABLE ROW LEVEL SECURITY;

-- Service role only (sensitive clinical data)
CREATE POLICY "service_insert_crisis" ON public.crisis_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_read_crisis" ON public.crisis_events
  FOR SELECT USING (true);

CREATE INDEX idx_crisis_events_session ON public.crisis_events(session_id);
CREATE INDEX idx_crisis_events_user ON public.crisis_events(user_id);
CREATE INDEX idx_crisis_events_created ON public.crisis_events(created_at);
CREATE INDEX idx_crisis_events_severity ON public.crisis_events(severity);

-- Post-crisis mode: track sessions that need heightened monitoring
CREATE TABLE IF NOT EXISTS public.crisis_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  crisis_mode BOOLEAN DEFAULT true,
  highest_severity TEXT NOT NULL CHECK (highest_severity IN ('HIGH', 'MEDIUM', 'LOW')),
  crisis_count INTEGER DEFAULT 1,
  post_crisis_turns_remaining INTEGER DEFAULT 5,
  activated_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ
);

ALTER TABLE public.crisis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_manage_crisis_sessions" ON public.crisis_sessions
  FOR ALL USING (true);

CREATE INDEX idx_crisis_sessions_user ON public.crisis_sessions(user_id);
CREATE INDEX idx_crisis_sessions_active ON public.crisis_sessions(crisis_mode) WHERE crisis_mode = true;

-- RPC: Record crisis event and activate post-crisis mode
CREATE OR REPLACE FUNCTION public.record_crisis_event(
  p_session_id TEXT,
  p_user_id UUID,
  p_severity TEXT,
  p_cssrs_level INTEGER DEFAULT NULL,
  p_keywords TEXT[] DEFAULT '{}',
  p_reasoning TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Insert crisis event
  INSERT INTO public.crisis_events (session_id, user_id, severity, cssrs_level, detected_keywords, reasoning)
  VALUES (p_session_id, p_user_id, p_severity, p_cssrs_level, p_keywords, p_reasoning);

  -- Upsert crisis session (activate or escalate post-crisis mode)
  INSERT INTO public.crisis_sessions (session_id, user_id, crisis_mode, highest_severity, crisis_count, post_crisis_turns_remaining)
  VALUES (p_session_id, p_user_id, true, p_severity, 1, 5)
  ON CONFLICT (session_id) DO UPDATE SET
    crisis_mode = true,
    highest_severity = CASE
      WHEN EXCLUDED.highest_severity = 'HIGH' THEN 'HIGH'
      WHEN crisis_sessions.highest_severity = 'HIGH' THEN 'HIGH'
      WHEN EXCLUDED.highest_severity = 'MEDIUM' THEN 'MEDIUM'
      ELSE crisis_sessions.highest_severity
    END,
    crisis_count = crisis_sessions.crisis_count + 1,
    post_crisis_turns_remaining = 5;  -- Reset turns on new crisis
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Decrement post-crisis turns and deactivate when done
CREATE OR REPLACE FUNCTION public.decrement_post_crisis_turn(
  p_session_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.crisis_sessions
  SET post_crisis_turns_remaining = GREATEST(0, post_crisis_turns_remaining - 1),
      crisis_mode = CASE WHEN post_crisis_turns_remaining <= 1 THEN false ELSE true END,
      deactivated_at = CASE WHEN post_crisis_turns_remaining <= 1 THEN now() ELSE NULL END
  WHERE session_id = p_session_id AND crisis_mode = true
  RETURNING jsonb_build_object(
    'crisis_mode', crisis_mode,
    'turns_remaining', post_crisis_turns_remaining,
    'highest_severity', highest_severity,
    'crisis_count', crisis_count
  ) INTO v_result;

  RETURN COALESCE(v_result, '{"crisis_mode": false}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
