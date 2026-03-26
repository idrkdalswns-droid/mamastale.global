-- 043: 교사→학부모 동화 공유 링크 지원
-- teacher_stories에 share_token (UUID, unique) + share_expires_at 컬럼 추가

ALTER TABLE public.teacher_stories
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Unique index for token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_stories_share_token
  ON public.teacher_stories (share_token)
  WHERE share_token IS NOT NULL;

-- RLS: 공유 토큰으로 조회 시 인증 불필요 (별도 API에서 service role로 조회)
-- 기존 RLS 정책 유지, 공유 조회는 service role key 사용
