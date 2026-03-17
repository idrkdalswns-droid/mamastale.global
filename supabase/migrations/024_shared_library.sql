-- 024_shared_library.sql
-- 유치원 서재: 같은 teacher_code 그룹의 동화 공유 열람

-- 1) SECURITY DEFINER 함수: 현재 사용자의 최신 code 그룹의 session_id 반환
--    teacher_sessions의 own_sessions RLS를 우회하기 위해 필요
--    LIMIT 1: 여러 코드 사용 시 가장 최근 코드만 (교차 유치원 노출 방지)
CREATE OR REPLACE FUNCTION get_shared_session_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ts.id
  FROM teacher_sessions ts
  WHERE ts.code = (
    SELECT ts2.code
    FROM teacher_sessions ts2
    WHERE ts2.teacher_id = auth.uid()
    ORDER BY ts2.created_at DESC
    LIMIT 1
  )
$$;

-- 2) SELECT 전용 RLS: SECURITY DEFINER 함수를 통해 같은 code 그룹 동화 열람
--    own_stories(FOR ALL)와 OR 결합. INSERT/UPDATE/DELETE는 자기 것만.
CREATE POLICY "shared_library_read" ON teacher_stories
  FOR SELECT USING (
    session_id IN (SELECT get_shared_session_ids())
  );

-- 3) 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_code
  ON teacher_sessions(code);
CREATE INDEX IF NOT EXISTS idx_teacher_stories_session
  ON teacher_stories(session_id);
