-- 050_log_retention.sql
-- Log retention cleanup RPC: removes old entries from log tables.
-- Designed for manual execution via Supabase SQL Editor or admin API.
--
-- Retention policy:
--   llm_call_logs:      90 days (default)
--   event_logs:         90 days (default)
--   rate_limit_entries: expired only (expires_at < NOW())
--   crisis_events:      365 days (legal/clinical audit trail)

CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_log_days INTEGER DEFAULT 90,
  p_crisis_days INTEGER DEFAULT 365,
  p_batch INTEGER DEFAULT 1000
)
RETURNS JSONB AS $$
DECLARE
  llm_deleted INTEGER := 0;
  event_deleted INTEGER := 0;
  rate_deleted INTEGER := 0;
  crisis_deleted INTEGER := 0;
  batch_deleted INTEGER;
BEGIN
  -- llm_call_logs
  DELETE FROM public.llm_call_logs
  WHERE id IN (
    SELECT id FROM public.llm_call_logs
    WHERE created_at < NOW() - (p_log_days || ' days')::INTERVAL
    LIMIT p_batch
  );
  GET DIAGNOSTICS batch_deleted = ROW_COUNT;
  llm_deleted := batch_deleted;

  -- event_logs
  DELETE FROM public.event_logs
  WHERE id IN (
    SELECT id FROM public.event_logs
    WHERE created_at < NOW() - (p_log_days || ' days')::INTERVAL
    LIMIT p_batch
  );
  GET DIAGNOSTICS batch_deleted = ROW_COUNT;
  event_deleted := batch_deleted;

  -- rate_limit_entries (expired only)
  DELETE FROM public.rate_limit_entries
  WHERE id IN (
    SELECT id FROM public.rate_limit_entries
    WHERE expires_at < NOW()
    LIMIT p_batch
  );
  GET DIAGNOSTICS batch_deleted = ROW_COUNT;
  rate_deleted := batch_deleted;

  -- crisis_events (1 year retention)
  DELETE FROM public.crisis_events
  WHERE id IN (
    SELECT id FROM public.crisis_events
    WHERE created_at < NOW() - (p_crisis_days || ' days')::INTERVAL
    LIMIT p_batch
  );
  GET DIAGNOSTICS batch_deleted = ROW_COUNT;
  crisis_deleted := batch_deleted;

  RETURN jsonb_build_object(
    'llm_call_logs', llm_deleted,
    'event_logs', event_deleted,
    'rate_limit_entries', rate_deleted,
    'crisis_events', crisis_deleted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict execution: service_role only (prevent DoS via anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER, INTEGER, INTEGER) FROM authenticated;
