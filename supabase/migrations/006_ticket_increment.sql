-- 006: Atomic ticket increment function
-- Prevents race conditions when multiple concurrent requests try to credit tickets
-- Used by: /api/payments/confirm, /api/webhooks/stripe, /api/referral

CREATE OR REPLACE FUNCTION increment_tickets(
  p_user_id UUID,
  p_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET
    free_stories_remaining = GREATEST(0, COALESCE(free_stories_remaining, 0) + p_count),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING free_stories_remaining INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
