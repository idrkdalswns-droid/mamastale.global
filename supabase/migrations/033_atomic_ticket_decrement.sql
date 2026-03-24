-- Bug Bounty v1.38.0: Atomic ticket decrement with FOR UPDATE row lock
-- Prevents CAS race condition where two concurrent requests both read the same value
-- and both succeed in decrementing (Bug Bounty issue 3-1)
--
-- This function is ADDITIVE — existing increment_tickets and other RPCs are untouched.
-- Forward-compatible: safe to deploy before code update.

CREATE OR REPLACE FUNCTION decrement_ticket(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- FOR UPDATE locks the row until transaction commits, preventing concurrent reads
  SELECT free_stories_remaining INTO v_remaining
  FROM profiles WHERE id = p_user_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'user_not_found: %', p_user_id;
  END IF;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'insufficient_tickets: remaining=%, user=%', v_remaining, p_user_id;
  END IF;

  UPDATE profiles
  SET free_stories_remaining = v_remaining - 1,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_remaining - 1;
END;
$$;

-- Grant execute to authenticated users (RLS still applies via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION decrement_ticket(UUID) TO authenticated;
