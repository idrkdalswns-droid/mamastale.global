-- 048: Blind system for 3-service platform
-- blind_until: free story blind deadline (created_at + N days)
-- story_type: 'main' | 'diy' | 'tq' — service origin
-- has_ever_purchased: permanent blind unlock flag

-- profiles: has_ever_purchased flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_ever_purchased BOOLEAN DEFAULT false;

-- stories: blind_until + story_type
ALTER TABLE stories ADD COLUMN IF NOT EXISTS blind_until TIMESTAMPTZ;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'main';

-- site_settings: feature flags (blind config etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
  ('blind', '{"enabled": false, "days": 3}')
ON CONFLICT (key) DO NOTHING;

-- Performance index for TQ session lookups
CREATE INDEX IF NOT EXISTS idx_tq_sessions_user_status ON tq_sessions (user_id, status);

-- RPC: get_blind_config
CREATE OR REPLACE FUNCTION get_blind_config()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT value FROM site_settings WHERE key = 'blind';
$$;
