-- ============================================================
-- Migration 013: Structured Event Logging
-- API call tracking, error logging with PII masking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  latency_ms INTEGER,
  user_id UUID,
  ip_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Service role only (admin/ops data)
CREATE POLICY "service_insert_events" ON public.event_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_event_logs_type ON public.event_logs(event_type);
CREATE INDEX idx_event_logs_created ON public.event_logs(created_at);
CREATE INDEX idx_event_logs_endpoint ON public.event_logs(endpoint);
