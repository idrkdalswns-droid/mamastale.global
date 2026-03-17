-- 022: teacher_codes RLS 강화 + 인덱스 추가
-- defense-in-depth: verify-code 엔드포인트가 resolveUser() 필수이므로 흐름 안 깨짐

-- teacher_codes: 인증된 사용자만 활성 코드 조회 가능
DROP POLICY IF EXISTS "read_active_codes" ON teacher_codes;
CREATE POLICY "read_active_codes" ON teacher_codes
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- 성능 인덱스: teacher_id로 자주 필터링되는 테이블
CREATE INDEX IF NOT EXISTS idx_teacher_stories_teacher ON teacher_stories(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher ON teacher_sessions(teacher_id);
