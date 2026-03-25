-- Migration 034: Prevent locked stories from being published to community
-- Root cause: IDOR vulnerability — locked story (is_unlocked=false) could be set is_public=true
-- bypassing freemium paywall via /api/community/[id] which returns ALL scenes.

-- Step 1: Fix any existing violations (set public locked stories back to private)
UPDATE stories
SET is_public = false, updated_at = NOW()
WHERE is_unlocked = false AND is_public = true;

-- Step 2: Add CHECK constraint to prevent future violations
ALTER TABLE stories
ADD CONSTRAINT chk_locked_not_public
CHECK (is_unlocked = true OR is_public = false);
