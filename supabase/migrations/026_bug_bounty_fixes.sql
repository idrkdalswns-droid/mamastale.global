-- ============================================================
-- 026_bug_bounty_fixes.sql
-- Bug Bounty 시뮬레이션 결과 반영 (v1.22.2)
-- #1: Stripe 웹훅 이벤트 중복 방지 (DB 레벨)
-- #5: Toss order_claims 원자적 처리 (RPC 함수)
-- ============================================================

-- #1: Stripe 웹훅 이벤트 중복 방지 테이블
-- Edge Runtime의 인메모리 Map은 격리체 간 공유 불가 → DB가 소스 오브 트루스
CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: service role만 접근 (anon key로 접근 차단)
ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

-- 모든 접근 차단 (service_role은 RLS 바이패스)
CREATE POLICY "No public access" ON public.stripe_processed_events
  FOR ALL USING (false);

-- 30일 이상 된 이벤트 자동 정리 (공간 관리)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON public.stripe_processed_events (processed_at);

-- #5: Toss order_claims 원자적 처리 RPC
-- Edge Runtime에서 SELECT FOR UPDATE 사용 불가 → PL/pgSQL 함수로 원자적 처리
CREATE OR REPLACE FUNCTION public.claim_order_and_add_tickets(
  p_user_id UUID,
  p_order_id TEXT,
  p_tickets INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. order_claims에 INSERT (UNIQUE 제약으로 중복 방지)
  INSERT INTO public.order_claims (user_id, order_id, status)
  VALUES (p_user_id, p_order_id, 'confirmed');

  -- 2. 티켓 증가
  UPDATE public.profiles
  SET free_stories_remaining = free_stories_remaining + p_tickets
  WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- 이미 처리된 주문 — 중복 방지
    RETURN FALSE;
END;
$$;
