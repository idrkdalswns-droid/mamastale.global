-- P1-FIX(S7): Replace DELETE rollback with status flag for order_claims
-- MUST run before code deployment (INSERT with status field requires column to exist)
--
-- Existing rows get DEFAULT 'confirmed' (all are successful — failed rows were already DELETEd)

ALTER TABLE order_claims
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'
  CHECK (status IN ('pending', 'confirmed', 'rolled_back'));

ALTER TABLE order_claims
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
