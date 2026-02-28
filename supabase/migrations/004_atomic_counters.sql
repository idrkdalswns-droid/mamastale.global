-- 004: Atomic counter increment function
-- Fixes race condition in view_count, like_count, comment_count

CREATE OR REPLACE FUNCTION increment_story_counter(
  p_story_id UUID,
  p_column TEXT,
  p_delta INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  IF p_column = 'view_count' THEN
    UPDATE public.stories SET view_count = GREATEST(0, COALESCE(view_count, 0) + p_delta) WHERE id = p_story_id;
  ELSIF p_column = 'like_count' THEN
    UPDATE public.stories SET like_count = GREATEST(0, COALESCE(like_count, 0) + p_delta) WHERE id = p_story_id;
  ELSIF p_column = 'comment_count' THEN
    UPDATE public.stories SET comment_count = GREATEST(0, COALESCE(comment_count, 0) + p_delta) WHERE id = p_story_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
