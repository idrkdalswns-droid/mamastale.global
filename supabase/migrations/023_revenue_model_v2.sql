-- 023_revenue_model_v2.sql
-- Freemium lock model: 60% preview + auto-unlock on payment
-- is_unlocked: false = locked (first free story), true = fully accessible
-- DEFAULT true ensures backward compatibility (existing stories remain unlocked)

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT true;

-- New users start with 0 free tickets (first story is free without ticket)
ALTER TABLE public.profiles
  ALTER COLUMN free_stories_remaining SET DEFAULT 0;
