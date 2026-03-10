-- Migration 019: Push notification subscriptions
-- Sprint 4-A: Web Push API subscription storage

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,       -- Public key for encryption
  auth_key TEXT NOT NULL,     -- Auth secret for encryption
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)   -- One subscription per endpoint per user
);

-- Index for efficient user lookups (send notifications to specific user)
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_id);

-- Index for cleanup of old subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subs_created ON public.push_subscriptions (created_at);

-- RLS: Users can only manage their own subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all (for push sending)
CREATE POLICY "Service role full access"
  ON public.push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');
