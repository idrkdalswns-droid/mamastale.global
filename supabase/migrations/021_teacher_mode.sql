-- 021_teacher_mode.sql
-- 선생님 모드: 유치원/어린이집 교사용 AI 그림책 창작 시스템
-- 4개 테이블 + RLS + 인덱스

-- ============================================================
-- 1. teacher_codes: 접근 코드 (기관별 발급)
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- 예: 'HANA-2024'
  kindergarten_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daily_session_limit INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE teacher_codes ENABLE ROW LEVEL SECURITY;

-- 활성 코드만 조회 가능 (인증 불필요)
CREATE POLICY "read_active_codes" ON teacher_codes
  FOR SELECT USING (is_active = true);

-- ============================================================
-- 2. teacher_sessions: 교사 세션 (3시간 만료)
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES teacher_codes(code),
  expires_at TIMESTAMPTZ NOT NULL,
  current_phase TEXT DEFAULT 'A' CHECK (current_phase IN ('A','B','C','D','E','DONE')),
  turn_count INT DEFAULT 0,
  onboarding JSONB DEFAULT '{}',
  stories_created INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;

-- 자신의 세션만 접근
CREATE POLICY "own_sessions" ON teacher_sessions
  FOR ALL USING (auth.uid() = teacher_id);

-- 레이트 리미팅: 코드별 일일 세션 수 조회용
CREATE INDEX idx_teacher_sessions_code_day
  ON teacher_sessions(code, created_at);

-- ============================================================
-- 3. teacher_messages: 대화 기록
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES teacher_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE teacher_messages ENABLE ROW LEVEL SECURITY;

-- 자신의 세션에 속한 메시지만 접근
CREATE POLICY "own_messages" ON teacher_messages
  FOR ALL USING (session_id IN (
    SELECT id FROM teacher_sessions WHERE teacher_id = auth.uid()
  ));

-- 세션별 메시지 조회 최적화
CREATE INDEX idx_teacher_messages_session
  ON teacher_messages(session_id, created_at);

-- ============================================================
-- 4. teacher_stories: 생성된 동화
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES teacher_sessions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  spreads JSONB NOT NULL DEFAULT '[]',       -- [{spreadNumber, title, text}]
  metadata JSONB DEFAULT '{}',               -- readingGuide, illustPrompts, nuriMapping, devReview
  brief_context JSONB DEFAULT '{}',          -- Haiku 추출 결과 보존
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE teacher_stories ENABLE ROW LEVEL SECURITY;

-- 자신의 동화만 접근
CREATE POLICY "own_stories" ON teacher_stories
  FOR ALL USING (auth.uid() = teacher_id);

-- ============================================================
-- 5. 초기 테스트 코드 삽입
-- ============================================================
INSERT INTO teacher_codes (code, kindergarten_name) VALUES
  ('MAMA-TEST', '엄마엄마동화 테스트'),
  ('HANA-2024', '하나유치원'),
  ('SARANG-2024', '사랑어린이집')
ON CONFLICT (code) DO NOTHING;
