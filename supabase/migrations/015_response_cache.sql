-- ============================================================
-- Migration 015: Semantic Response Cache (GPTCache-inspired)
-- Cache Phase 1 empathy responses to reduce API costs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.response_cache (
  message_hash TEXT PRIMARY KEY,
  phase INTEGER NOT NULL DEFAULT 1 CHECK (phase = 1),
  response_content TEXT NOT NULL,
  response_phase INTEGER,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);

ALTER TABLE public.response_cache ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "service_only_cache" ON public.response_cache
  FOR ALL USING (true);

CREATE INDEX idx_cache_expires ON public.response_cache(expires_at);

-- Cleanup expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.response_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
