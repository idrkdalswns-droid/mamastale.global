-- 028: Nightwatch Security Hardening (2026-03-19)
-- Fixes: F-005 (order_claims RLS), F-022 (llm_call_logs INSERT), F-023 (event_logs INSERT)
-- Applied via Supabase dashboard BEFORE code deployment

-- ═══════════════════════════════════════════
-- 1. order_claims: Enable RLS + deny-all policy
--    All access is through service_role (bypasses RLS)
-- ═══════════════════════════════════════════
ALTER TABLE IF EXISTS public.order_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_only" ON public.order_claims FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════
-- 2. llm_call_logs: Close INSERT to anon users
--    Was: WITH CHECK (true) — anyone could insert fake logs
--    Now: WITH CHECK (false) — service_role only
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "service_insert_logs" ON public.llm_call_logs;
CREATE POLICY "service_only_insert_logs" ON public.llm_call_logs
  FOR INSERT WITH CHECK (false);

-- ═══════════════════════════════════════════
-- 3. event_logs: Close INSERT to anon users
--    Was: WITH CHECK (true) — anyone could insert fake events
--    Now: WITH CHECK (false) — service_role only
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "service_insert_events" ON public.event_logs;
CREATE POLICY "service_only_insert_events" ON public.event_logs
  FOR INSERT WITH CHECK (false);
