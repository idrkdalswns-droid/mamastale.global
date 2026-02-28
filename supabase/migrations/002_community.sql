-- ═══════════════════════════════════════════════════
-- MAMASTALE COMMUNITY FEATURES v2.0
-- ═══════════════════════════════════════════════════

-- Add public sharing columns to stories
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS author_alias TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Drop existing restrictive policy and create new ones
DROP POLICY IF EXISTS "users_own_stories" ON public.stories;

-- Users can manage their own stories (full CRUD)
CREATE POLICY "users_own_stories" ON public.stories
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can read public stories
CREATE POLICY "public_stories_read" ON public.stories
  FOR SELECT USING (is_public = true);

-- Index for efficient public story queries
CREATE INDEX IF NOT EXISTS idx_stories_public ON public.stories(is_public, created_at DESC)
  WHERE is_public = true;
