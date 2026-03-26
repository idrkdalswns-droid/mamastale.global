-- 040: Atomic user deletion with full cascade
-- Replaces non-transactional JS deletion with a single atomic DB function.
-- SECURITY DEFINER: runs with owner privileges (needed for cross-table deletes).
-- All tables are cleaned in FK-safe order within a single transaction.

CREATE OR REPLACE FUNCTION delete_user_cascade(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_story_ids UUID[];
  v_comment_ids UUID[];
  v_teacher_session_ids UUID[];
BEGIN
  -- Collect IDs for dependent deletes
  SELECT COALESCE(array_agg(id), '{}') INTO v_story_ids
    FROM stories WHERE user_id = p_user_id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_teacher_session_ids
    FROM teacher_sessions WHERE teacher_id = p_user_id;

  -- Phase 0: Cross-user references (others' data referencing this user's content)
  IF array_length(v_story_ids, 1) > 0 THEN
    -- Reports on comments under this user's stories
    SELECT COALESCE(array_agg(c.id), '{}') INTO v_comment_ids
      FROM community_comments c WHERE c.story_id = ANY(v_story_ids);
    IF array_length(v_comment_ids, 1) > 0 THEN
      DELETE FROM comment_reports WHERE comment_id = ANY(v_comment_ids);
    END IF;
    -- Others' comments and likes on this user's stories
    DELETE FROM community_comments WHERE story_id = ANY(v_story_ids);
    DELETE FROM community_likes WHERE story_id = ANY(v_story_ids);
  END IF;

  -- Reports on this user's own comments (by other reporters)
  SELECT COALESCE(array_agg(id), '{}') INTO v_comment_ids
    FROM community_comments WHERE user_id = p_user_id;
  IF array_length(v_comment_ids, 1) > 0 THEN
    DELETE FROM comment_reports WHERE comment_id = ANY(v_comment_ids);
  END IF;

  -- Phase 1: This user's own records (FK leaf tables first)
  DELETE FROM comment_reports WHERE user_id = p_user_id;
  DELETE FROM community_likes WHERE user_id = p_user_id;
  DELETE FROM community_comments WHERE user_id = p_user_id;
  DELETE FROM feedback WHERE user_id = p_user_id;
  DELETE FROM user_reviews WHERE user_id = p_user_id;

  -- Teacher mode tables
  DELETE FROM worksheet_outputs WHERE user_id = p_user_id;
  IF array_length(v_teacher_session_ids, 1) > 0 THEN
    DELETE FROM teacher_messages WHERE session_id = ANY(v_teacher_session_ids);
    DELETE FROM teacher_stories WHERE session_id = ANY(v_teacher_session_ids);
  END IF;
  DELETE FROM teacher_sessions WHERE teacher_id = p_user_id;

  -- Main chat tables
  DELETE FROM messages WHERE session_id IN
    (SELECT id FROM sessions WHERE user_id = p_user_id);
  DELETE FROM sessions WHERE user_id = p_user_id;

  -- Referrals (both directions)
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;

  -- Observability tables (non-critical but GDPR-required)
  DELETE FROM event_logs WHERE user_id = p_user_id;
  DELETE FROM llm_call_logs WHERE user_id = p_user_id;
  DELETE FROM crisis_events WHERE user_id = p_user_id;

  -- Phase 2: Primary tables
  DELETE FROM stories WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE;  -- Re-raise to trigger transaction rollback
END;
$$;
