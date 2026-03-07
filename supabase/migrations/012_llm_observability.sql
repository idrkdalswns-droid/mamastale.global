-- ============================================================
-- Migration 012: LLM Call Observability (Langfuse-inspired)
-- Track every LLM API call for cost dashboards, quality monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS public.llm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  model_used TEXT NOT NULL,
  phase INTEGER CHECK (phase BETWEEN 1 AND 4),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  was_cached BOOLEAN DEFAULT false,
  was_crisis_intercepted BOOLEAN DEFAULT false,
  was_model_fallback BOOLEAN DEFAULT false,
  fallback_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.llm_call_logs ENABLE ROW LEVEL SECURITY;

-- Service role inserts from API routes
CREATE POLICY "service_insert_logs" ON public.llm_call_logs
  FOR INSERT WITH CHECK (true);

-- Users can read their own logs
CREATE POLICY "users_read_own_logs" ON public.llm_call_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_llm_logs_user ON public.llm_call_logs(user_id);
CREATE INDEX idx_llm_logs_created ON public.llm_call_logs(created_at);
CREATE INDEX idx_llm_logs_model ON public.llm_call_logs(model_used);
CREATE INDEX idx_llm_logs_session ON public.llm_call_logs(session_id);
