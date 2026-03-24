-- 032_teacher_manual_stories.sql
-- 선생님 모드: 수동 동화 작성 + soft-delete 지원
-- session_id는 NOT NULL 유지 (FK CASCADE + shared_library_read RLS 호환)

-- ============================================================
-- 1. 새 컬럼 추가
-- ============================================================
ALTER TABLE teacher_stories ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai'
  CHECK (source IN ('ai', 'manual'));

ALTER TABLE teacher_stories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- 2. 성능 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teacher_stories_active
  ON teacher_stories(teacher_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. RLS 정책 분리 (기존 own_stories → CRUD별 분리 + soft-delete 필터)
-- ============================================================
DROP POLICY IF EXISTS "own_stories" ON teacher_stories;

-- SELECT: 삭제되지 않은 자신의 동화만
CREATE POLICY "own_stories_select" ON teacher_stories
  FOR SELECT USING (auth.uid() = teacher_id AND deleted_at IS NULL);

-- INSERT: 자신의 동화만
CREATE POLICY "own_stories_insert" ON teacher_stories
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- UPDATE: 삭제되지 않은 자신의 동화만 (soft-delete UPDATE 포함)
CREATE POLICY "own_stories_update" ON teacher_stories
  FOR UPDATE USING (auth.uid() = teacher_id);

-- DELETE: 자신의 동화만 (hard delete — 현재 미사용, 방어적)
CREATE POLICY "own_stories_delete" ON teacher_stories
  FOR DELETE USING (auth.uid() = teacher_id);

-- ============================================================
-- 4. shared_library_read도 soft-delete 필터 추가
-- ============================================================
DROP POLICY IF EXISTS "shared_library_read" ON teacher_stories;

CREATE POLICY "shared_library_read" ON teacher_stories
  FOR SELECT USING (
    deleted_at IS NULL AND session_id IN (SELECT get_shared_session_ids())
  );
