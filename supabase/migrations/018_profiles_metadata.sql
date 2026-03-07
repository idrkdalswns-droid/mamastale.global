-- Migration 018: Add metadata JSONB column to profiles
-- Required for: payment idempotency (processed_orders), premium detection, first-purchase validation

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for efficient metadata queries
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON public.profiles USING gin (metadata);
