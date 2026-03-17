-- ============================================================
-- Migration 025: Security Hardening
-- P1-6: crisis_events/sessions RLS → service-role only
-- 0-4: rate_limits cleanup respects per-entry window duration
-- ============================================================

-- ─── P1-6: Restrict crisis tables to service-role only ───
-- RPCs use SECURITY DEFINER so they bypass RLS.
-- Anon/authenticated users must NOT read sensitive clinical data.

-- crisis_events: DROP overly permissive policies, add restrictive ones
DROP POLICY IF EXISTS "service_insert_crisis" ON public.crisis_events;
DROP POLICY IF EXISTS "service_read_crisis" ON public.crisis_events;

CREATE POLICY "service_only_insert_crisis" ON public.crisis_events
  FOR INSERT WITH CHECK (false);

CREATE POLICY "service_only_read_crisis" ON public.crisis_events
  FOR SELECT USING (false);

-- crisis_sessions: DROP overly permissive policy, add restrictive one
DROP POLICY IF EXISTS "service_manage_crisis_sessions" ON public.crisis_sessions;

CREATE POLICY "service_only_manage_crisis_sessions" ON public.crisis_sessions
  FOR ALL USING (false);

-- ─── 0-4: Add window_seconds column to rate_limits ───
-- Needed so cleanup can respect per-entry window duration
-- (e.g., 60s rate limit vs 86400s guest turn limit)
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS window_seconds INTEGER DEFAULT 60;

-- ─── 0-4: Update check_rate_limit to store window_seconds per entry ───
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  SELECT count, window_start INTO v_count, v_window_start
  FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, window_start, window_seconds)
    VALUES (p_key, 1, now(), p_window_seconds);
    RETURN true;
  END IF;

  IF now() > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.rate_limits SET count = 1, window_start = now(), window_seconds = p_window_seconds WHERE key = p_key;
    RETURN true;
  END IF;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 0-4: Fix cleanup to use per-entry window instead of hardcoded 5 minutes ───
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start + (window_seconds || ' seconds')::INTERVAL < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
