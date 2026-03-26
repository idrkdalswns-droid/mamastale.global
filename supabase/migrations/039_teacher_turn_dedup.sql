-- 039: Teacher message turn dedup
-- Adds turn_number to teacher_messages for DB-level deduplication.
-- Unique index on (session_id, turn_number, role) prevents duplicate messages per turn.
-- NULL turn_number rows (historical) are excluded from uniqueness check.

ALTER TABLE teacher_messages ADD COLUMN IF NOT EXISTS turn_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_messages_session_turn_role
  ON teacher_messages(session_id, turn_number, role)
  WHERE turn_number IS NOT NULL;
