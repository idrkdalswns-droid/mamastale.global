-- 027: Add 'ticket_failed' to subscriptions status CHECK constraint
-- Context: Bug bounty 7-Pass review — Stripe incrementTickets() failure recovery
-- When ticket increment fails after subscription INSERT, mark as 'ticket_failed'
-- instead of DELETE (preserves idempotency for Stripe webhook retries)

-- Drop existing CHECK constraint and recreate with 'ticket_failed' added
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'ticket_failed'));
