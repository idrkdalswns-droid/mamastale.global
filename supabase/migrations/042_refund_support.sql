-- Bug Bounty Phase 1: Refund support
-- 1. Add 'refunded' to subscriptions status CHECK constraint
-- 2. Create decrement_tickets_refund RPC for multi-ticket refund

-- Step 1: Update CHECK constraint to include 'refunded'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'ticket_failed', 'refunded'));

-- Step 2: Atomic multi-ticket decrement for refunds
-- Uses GREATEST(0, ...) to prevent negative balance
CREATE OR REPLACE FUNCTION decrement_tickets_refund(p_user_id UUID, p_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER;
  v_new_remaining INTEGER;
BEGIN
  IF p_count < 1 OR p_count > 10 THEN
    RAISE EXCEPTION 'invalid_count: %', p_count;
  END IF;

  SELECT free_stories_remaining INTO v_remaining
  FROM profiles WHERE id = p_user_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'user_not_found: %', p_user_id;
  END IF;

  v_new_remaining := GREATEST(0, v_remaining - p_count);

  UPDATE profiles
  SET free_stories_remaining = v_new_remaining,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_new_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_tickets_refund(UUID, INTEGER) TO service_role;
