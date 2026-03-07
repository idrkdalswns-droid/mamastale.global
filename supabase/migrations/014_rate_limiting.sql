-- ============================================================
-- Migration 014: Supabase-backed Rate Limiting
-- Persistent rate limits that survive deploys and cold starts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "service_only_rate_limits" ON public.rate_limits
  FOR ALL USING (true);

CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

-- Atomic check-and-increment RPC (prevents race conditions via FOR UPDATE)
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
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, now());
    RETURN true;
  END IF;

  IF now() > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN true;
  END IF;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired entries (call periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
